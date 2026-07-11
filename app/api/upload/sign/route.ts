import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'video/mp4', 'video/webm', 'video/quicktime',
])

const MAX_SIZE_BYTES = {
  img: 10 * 1024 * 1024,   // 10MB (before client-side compression)
  pdf: 20 * 1024 * 1024,   // 20MB
  vid: 100 * 1024 * 1024,  // 100MB
}

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function POST(request: NextRequest) {
  // Authenticate user
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { storageKey, contentType, fileSizeBytes } = body

  // Validate inputs
  if (!storageKey || !contentType || !fileSizeBytes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  // Ensure the storage key is scoped to this user's profiles
  // Format: evidence/{profileId}/{proofItemId}/{filename}
  if (!storageKey.startsWith('evidence/')) {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 })
  }

  const keyParts = storageKey.split('/')
  if (keyParts.length < 4) {
    return NextResponse.json({ error: 'Invalid storage key format' }, { status: 400 })
  }

  const profileId = keyParts[1]

  // Verify this user owns the profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found or unauthorized' }, { status: 403 })
  }

  // Size limit check
  const type = contentType.startsWith('image/') ? 'img'
    : contentType === 'application/pdf' ? 'pdf'
    : 'vid'

  if (fileSizeBytes > MAX_SIZE_BYTES[type]) {
    return NextResponse.json({
      error: `File too large. Max ${MAX_SIZE_BYTES[type] / 1024 / 1024}MB for ${type}`
    }, { status: 400 })
  }

  try {
    const r2 = getR2Client()

    const command = new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         storageKey,
      ContentType: contentType,
    })

    // Signed URL expires in 10 minutes
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 600 })
    const publicUrl = `${process.env.NEXT_PUBLIC_MEDIA_DOMAIN}/${storageKey}`

    return NextResponse.json({ uploadUrl, publicUrl, storageKey })
  } catch (err: any) {
    console.error('Failed to generate signed URL:', err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
