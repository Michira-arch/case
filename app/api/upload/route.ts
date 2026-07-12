import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export async function POST(request: NextRequest) {
  // Authenticate user
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const storageKey = formData.get('storageKey') as string | null

    if (!file || !storageKey) {
      return NextResponse.json({ error: 'Missing file or storage key' }, { status: 400 })
    }

    // Security validation
    const isEvidence = storageKey.startsWith('evidence/')
    const isAvatar = storageKey.startsWith('avatars/')
    if (!isEvidence && !isAvatar) {
      return NextResponse.json({ error: 'Invalid storage key prefix' }, { status: 400 })
    }

    const keyParts = storageKey.split('/')
    if (keyParts.length < 3) {
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // S3 client configured for Cloudflare R2
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         storageKey,
      ContentType: file.type,
      Body:        buffer,
    }))

    const publicUrl = `${process.env.NEXT_PUBLIC_MEDIA_DOMAIN}/${storageKey}`

    return NextResponse.json({ success: true, publicUrl, storageKey })
  } catch (err: any) {
    console.error('Server upload proxy failed:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
