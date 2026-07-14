import { NextRequest, NextResponse } from 'next/server'
import { getMediaUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
  }

  try {
    const targetUrl = getMediaUrl(key)
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
