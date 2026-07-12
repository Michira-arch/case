import imageCompression from 'browser-image-compression'

export interface UploadResult {
  storageKey: string
  publicUrl: string
  type: 'img' | 'pdf' | 'vid'
  bytesOriginal: number
  bytesCompressed: number
}

export interface UploadOptions {
  file: File
  profileId: string
  proofItemId: string
  onProgress?: (stage: string, percent: number) => void
}

function getFileType(file: File): 'img' | 'pdf' | 'vid' {
  if (file.type.startsWith('image/')) return 'img'
  if (file.type === 'application/pdf') return 'pdf'
  return 'vid'
}

function generateStorageKey(profileId: string, proofItemId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
  const id  = Math.random().toString(36).slice(2, 10)
  const ts  = Date.now()
  return `evidence/${profileId}/${proofItemId}/${ts}-${id}.${ext}`
}

/**
 * Full upload pipeline:
 * 1. Compress image client-side (WebP, ≤300KB)
 * 2. Get signed PUT URL from our API
 * 3. PUT directly to R2 (bypass our server)
 * 4. Return storage key for DB insertion
 */
export async function uploadEvidence(opts: UploadOptions): Promise<UploadResult> {
  const { file, profileId, proofItemId, onProgress } = opts
  const type = getFileType(file)
  const bytesOriginal = file.size

  let uploadFile = file
  let bytesCompressed = file.size

  // Step 1: Compress images
  if (type === 'img') {
    onProgress?.('Compressing…', 10)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,          // 300KB target
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/webp',
        onProgress: (p) => {
          onProgress?.('Compressing…', Math.round(p * 0.3))  // 0-30%
        },
      })
      uploadFile = compressed
      bytesCompressed = compressed.size
    } catch (err) {
      console.warn('Compression failed, using original', err)
    }
  }

  // Step 2: Get signed URL
  onProgress?.('Getting upload URL…', 35)

  // Use webp extension for compressed images
  const filename = type === 'img'
    ? `image.webp`
    : file.name

  const storageKey = generateStorageKey(profileId, proofItemId, filename)

  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storageKey,
      contentType: type === 'img' ? 'image/webp' : uploadFile.type,
      fileSizeBytes: bytesCompressed,
    }),
  })

  if (!signRes.ok) {
    const err = await signRes.json()
    throw new Error(err.error || 'Failed to get upload URL')
  }

  const { uploadUrl, publicUrl } = await signRes.json()

  // Step 3: Upload to R2 directly with progress tracking
  onProgress?.('Uploading…', 40)

  await uploadWithProgress(uploadFile, uploadUrl, type === 'img' ? 'image/webp' : uploadFile.type, (p) => {
    onProgress?.('Uploading…', 40 + Math.round(p * 0.55))  // 40-95%
  })

  onProgress?.('Done', 100)

  return {
    storageKey,
    publicUrl,
    type,
    bytesOriginal,
    bytesCompressed: uploadFile.size,
  }
}

/**
 * XMLHttpRequest upload with real progress tracking
 * (fetch doesn't support upload progress)
 */
function uploadWithProgress(
  file: File | Blob,
  url: string,
  contentType: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))

    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.timeout = 120000  // 2 minutes
    xhr.send(file)
  })
}

/**
 * Get the public URL for a stored file
 */
export function getMediaUrl(storageKeyOrUrl: string): string {
  if (!storageKeyOrUrl) return ''
  // Already a full URL
  if (storageKeyOrUrl.startsWith('http')) return storageKeyOrUrl
  // Transform storage key → CDN URL
  const domain = process.env.NEXT_PUBLIC_MEDIA_DOMAIN ||
    (typeof window !== 'undefined' ? '' : '')
  return `${domain}/${storageKeyOrUrl}`
}

export async function uploadAvatar(file: File, profileId: string): Promise<string> {
  // Compress first using basic options
  let uploadFile = file
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.2, // 200KB target for avatar
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: 'image/webp',
    })
    uploadFile = compressed
  } catch (err) {
    console.warn('Avatar compression failed, using original', err)
  }

  const ext = 'webp'
  const storageKey = `avatars/${profileId}/${Date.now()}.${ext}`

  // 1. Get signed URL
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storageKey,
      contentType: 'image/webp',
      fileSizeBytes: uploadFile.size,
    }),
  })

  if (!signRes.ok) {
    const err = await signRes.json()
    throw new Error(err.error || 'Failed to get upload URL')
  }

  const { uploadUrl } = await signRes.json()

  // 2. PUT directly to R2
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: uploadFile,
  })

  return storageKey
}

export { generateStorageKey }
