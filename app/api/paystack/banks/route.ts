import { NextResponse } from 'next/server'

export async function GET() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Paystack secret key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.paystack.co/bank?currency=KES', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch banks: ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching banks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
