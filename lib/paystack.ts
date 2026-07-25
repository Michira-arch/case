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
export function generateReference(prefix: string = 'CASE'): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${ts}-${rand}`.toUpperCase()
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
 * Create a Paystack Subaccount for automated split settlements (server-side)
 */
export async function createPaystackSubaccount(opts: {
  business_name: string
  settlement_bank: string // e.g. "057" (M-Pesa) or Bank Code
  account_number: string
  percentage_charge: number // e.g. 20 (for 20% agency cut)
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set')

  const res = await fetch('https://api.paystack.co/subaccount', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      business_name: opts.business_name,
      settlement_bank: opts.settlement_bank,
      account_number: opts.account_number,
      percentage_charge: opts.percentage_charge,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Failed to create Paystack subaccount: ${res.status} - ${errorBody}`)
  }

  const data = await res.json()
  return data.data // Contains subaccount_code e.g. "ACCT_8686689696"
}

/**
 * Initialize a Split Payment Transaction via Paystack API (server-side)
 */
export async function initializePaystackSplitTransaction(opts: {
  email: string
  amount_kes: number
  subaccount_code: string
  transaction_charge_kes: number // Agency fee in KES
  reference: string
  callback_url?: string
  metadata?: Record<string, unknown>
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set')

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amount_kes * 100, // Paystack expects kobo/cents (KES × 100)
      currency: 'KES',
      subaccount: opts.subaccount_code,
      transaction_charge: opts.transaction_charge_kes * 100,
      reference: opts.reference,
      callback_url: opts.callback_url,
      metadata: opts.metadata,
      channels: ['card', 'mobile_money'],
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Failed to initialize split transaction: ${res.status} - ${errorBody}`)
  }

  const data = await res.json()
  return data.data // Contains authorization_url, access_code, reference
}

/**
 * Open the Paystack inline checkout modal (client-side)
 */
export interface CheckoutOptions {
  email: string
  amountKes: number
  reference: string
  profileId: string
  planPeriod: string
  subaccountCode?: string
  transactionChargeKes?: number
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

  const setupOpts: Record<string, unknown> = {
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
    label:     `Case Payment (${opts.planPeriod})`,
    callback:  (response: { reference: string }) => {
      opts.onSuccess(response.reference)
    },
    onClose:   opts.onClose,
  }

  if (opts.subaccountCode) {
    setupOpts.subaccount = opts.subaccountCode
  }
  if (opts.transactionChargeKes) {
    setupOpts.transaction_charge = opts.transactionChargeKes * 100
  }

  // @ts-ignore
  const handler = window.PaystackPop.setup(setupOpts)
  handler.openIframe()
}
