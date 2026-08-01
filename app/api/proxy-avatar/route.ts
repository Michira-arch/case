import { NextRequest, NextResponse } from 'next/server'
import { getMediaUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

// Only hosts owned by our media/CDN may be proxied through this endpoint. This
// prevents SSRF: getMediaUrl() returns any `http…` string unchanged, so without
// this allowlist the server would fetch arbitrary internal URLs (e.g. the
// cloud-metadata endpoint 169.254.169.254).
const STATIC_ALLOWED_HOSTS = new Set([
  'media.dispatch.bld.co.ke',
])

function isAllowedTarget(url: URL): boolean {
  if (STATIC_ALLOWED_HOSTS.has(url.hostname)) return true
  // R2 object hosts look like <bucket>.<account>.r2.cloudflarestorage.com
  if (url.hostname.endsWith('.r2.cloudflarestorage.com')) return true
  // The configured public media domain
  const mediaDomain = process.env.NEXT_PUBLIC_MEDIA_DOMAIN
  if (mediaDomain) {
    try {
      if (url.hostname === new URL(mediaDomain).hostname) return true
    } catch {
      // ignore malformed env value
    }
  }
  return false
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
  }

  try {
    const targetUrl = getMediaUrl(key)

    let parsed: URL
    try {
      parsed = new URL(targetUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 })
    }

    if (!isAllowedTarget(parsed)) {
      return NextResponse.json({ error: 'Target host not allowed' }, { status: 403 })
    }

    const res = await fetch(targetUrl)

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image from storage' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await res.arrayBuffer()

    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', contentType)
    responseHeaders.set('Cache-Control', 'public, max-age=86400')
    responseHeaders.set('Access-Control-Allow-Origin', '*')

    return new Response(arrayBuffer, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
