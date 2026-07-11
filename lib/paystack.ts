import crypto from 'crypto'

// Pricing config — mirrors pricing_plans table
export const PRICING = {
  '6m': {
    id: '6m',
    label: '6 months',
    amount_kes: 70,
    months: 6,
    description: 'Great for trying Case+ for a season',
  },
  '12m': {
    id: '12m',
    label: '12 months',
    amount_kes: 100,
    months: 12,
    description: 'Best value — pay less per month',
  },
} as const

export type PlanPeriod = keyof typeof PRICING

/**
 * Generate a unique payment reference
 */
export function generateReference(profileId: string): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `CASE-${profileId.slice(0, 6)}-${ts}-${rand}`.toUpperCase()
}

/**
 * Verify Paystack webhook HMAC signature (server-side only)
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY not set')
    return false
  }

  const computedSig = crypto
    .createHmac('sha512', secretKey)
    .update(body)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedSig, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

/**
 * Verify a transaction by reference via Paystack API
 * Use for additional server-side verification if needed
 */
export async function verifyTransaction(reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set')

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Paystack verification failed: ${res.status}`)
  }

  const data = await res.json()
  return data.data
}

/**
 * Open the Paystack inline checkout modal (client-side)
 * Requires the Paystack inline script to be loaded
 */
export interface CheckoutOptions {
  email: string
  amountKes: number
  reference: string
  profileId: string
  planPeriod: string
  onSuccess: (reference: string) => void
  onClose: () => void
}

export function openPaystackCheckout(opts: CheckoutOptions) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

  if (!publicKey) {
    console.error('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY not set')
    return
  }

  // @ts-ignore — Paystack global injected by script
  if (typeof window === 'undefined' || !window.PaystackPop) {
    console.error('Paystack script not loaded')
    alert('Payment system not loaded. Please refresh and try again.')
    return
  }

  // @ts-ignore
  const handler = window.PaystackPop.setup({
    key:       publicKey,
    email:     opts.email,
    amount:    opts.amountKes * 100,  // Paystack uses kobo (KES × 100)
    currency:  'KES',
    ref:       opts.reference,
    channels:  ['card', 'mobile_money'],  // Enable M-Pesa
    metadata: {
      profile_id:  opts.profileId,
      plan_period: opts.planPeriod,
      custom_fields: [
        {
          display_name:  'Profile ID',
          variable_name: 'profile_id',
          value:         opts.profileId,
        },
        {
          display_name:  'Plan Period',
          variable_name: 'plan_period',
          value:         opts.planPeriod,
        },
      ],
    },
    label:     `Case+ (${opts.planPeriod})`,
    callback:  (response: { reference: string }) => {
      opts.onSuccess(response.reference)
    },
    onClose:   opts.onClose,
  })

  handler.openIframe()
}
