import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  const resolvedParams = await params
  const code = resolvedParams?.code

  const response = NextResponse.redirect(new URL('/', request.url))

  if (code && /^[a-z0-9._-]{3,30}$/i.test(code)) {
    // Set cookie for 30 days. httpOnly: false so client JS can read it during onboarding
    response.cookies.set('ref_code', code.toLowerCase(), {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }

  return response
}
