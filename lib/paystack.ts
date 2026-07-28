import crypto from 'crypto'

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
  'agency_monthly': {
    id: 'agency_monthly',
    label: 'Agency Monthly',
    amount_kes: 1000,
    months: 1,
    description: 'Standard agency billing',
  },
  'agency_yearly': {
    id: 'agency_yearly',
    label: 'Agency Yearly',
    amount_kes: 10000,
    months: 12,
    description: 'Save big with an annual plan',
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
 * Create a Paystack subaccount for an agency (to route split payments)
 */
export async function createSubaccount(params: {
  business_name: string
  settlement_bank: string
  account_number: string
  primary_contact_email?: string
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set')

  const res = await fetch(`https://api.paystack.co/subaccount`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      business_name: params.business_name,
      settlement_bank: params.settlement_bank,
      account_number: params.account_number,
      primary_contact_email: params.primary_contact_email,
    })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Paystack subaccount creation failed: ${data.message}`)
  }

  return data.data
}

/**
 * Charge an existing authorization (for automated billing of clients)
 */
export async function chargeAuthorization(params: {
  authorization_code: string
  email: string
  amount_kes: number
  reference?: string
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY not set')

  const res = await fetch(`https://api.paystack.co/transaction/charge_authorization`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      authorization_code: params.authorization_code,
      email: params.email,
      amount: params.amount_kes * 100, // kobo
      reference: params.reference
    })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Paystack charge failed: ${data.message}`)
  }

  return data.data
}

/**
 * Open the Paystack inline checkout modal (client-side)
 */
export interface CheckoutOptions {
  email: string
  amountKes: number
  reference: string
  profileId?: string
  planPeriod?: string
  invoiceId?: string
  subaccount?: string // Optional subaccount for splits
  onSuccess: (reference: string) => void
  onClose: () => void
}

export function openPaystackCheckout(opts: CheckoutOptions) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

  if (!publicKey) {
    console.error('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY not set')
    return
  }

  // @ts-ignore
  if (typeof window === 'undefined' || !window.PaystackPop) {
    console.error('Paystack script not loaded')
    alert('Payment system not loaded. Please refresh and try again.')
    return
  }

  const metadata: any = {
    custom_fields: [],
  }

  if (opts.profileId) {
    metadata.profile_id = opts.profileId
    metadata.custom_fields.push({
      display_name:  'Profile ID',
      variable_name: 'profile_id',
      value:         opts.profileId,
    })
  }

  if (opts.planPeriod) {
    metadata.plan_period = opts.planPeriod
    metadata.custom_fields.push({
      display_name:  'Plan Period',
      variable_name: 'plan_period',
      value:         opts.planPeriod,
    })
  }

  if (opts.invoiceId) {
    metadata.invoice_id = opts.invoiceId
    metadata.custom_fields.push({
      display_name:  'Invoice ID',
      variable_name: 'invoice_id',
      value:         opts.invoiceId,
    })
  }

  // @ts-ignore
  const handler = window.PaystackPop.setup({
    key:       publicKey,
    email:     opts.email,
    amount:    opts.amountKes * 100,
    currency:  'KES',
    ref:       opts.reference,
    channels:  ['card', 'mobile_money'],
    subaccount: opts.subaccount, // For splitting if needed
    metadata,
    label:     opts.invoiceId ? 'Invoice Payment' : `Billing (${opts.planPeriod})`,
    callback:  (response: { reference: string }) => {
      opts.onSuccess(response.reference)
    },
    onClose:   opts.onClose,
  })

  handler.openIframe()
}
