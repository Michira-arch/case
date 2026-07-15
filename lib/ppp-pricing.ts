/**
 * Purchasing Power Parity (PPP) Pricing module
 * Kenyan Shilling (KES) is the baseline currency.
 * Max price in high economic zones is 20 USD.
 * Minimum price is local equivalent of 100 KES.
 */

export interface PricingConfig {
  countryCode: string
  currency: string
  symbol: string
  exchangeRateToKes: number // Multiply local currency by this to get KES
  // Base prices in local currency before rounding and discount
  base12mLocal: number
  base6mLocal: number
  discountUnit: number      // E.g., 1 unit of local currency
  roundTo: number           // Round to nearest X units (e.g. 10, 100, 1000)
}

export const PPP_CONFIGS: Record<string, PricingConfig> = {
  KE: {
    countryCode: 'KE',
    currency: 'KES',
    symbol: 'KES',
    exchangeRateToKes: 1.0,
    base12mLocal: 100,
    base6mLocal: 70,
    discountUnit: 1,
    roundTo: 10,
  },
  US: {
    countryCode: 'US',
    currency: 'USD',
    symbol: '$',
    exchangeRateToKes: 130.0,
    base12mLocal: 20.0,
    base6mLocal: 10.0,
    discountUnit: 1,
    roundTo: 1,
  },
  GB: {
    countryCode: 'GB',
    currency: 'GBP',
    symbol: '£',
    exchangeRateToKes: 165.0,
    base12mLocal: 16.0,
    base6mLocal: 8.0,
    discountUnit: 1,
    roundTo: 1,
  },
  EU: {
    countryCode: 'EU',
    currency: 'EUR',
    symbol: '€',
    exchangeRateToKes: 140.0,
    base12mLocal: 18.0,
    base6mLocal: 9.0,
    discountUnit: 1,
    roundTo: 1,
  },
  IN: {
    countryCode: 'IN',
    currency: 'INR',
    symbol: '₹',
    exchangeRateToKes: 1.55,
    base12mLocal: 500,
    base6mLocal: 250,
    discountUnit: 1,
    roundTo: 10,
  },
  NG: {
    countryCode: 'NG',
    currency: 'NGN',
    symbol: '₦',
    exchangeRateToKes: 0.09,
    base12mLocal: 8000,
    base6mLocal: 4000,
    discountUnit: 1,
    roundTo: 100,
  },
  ZA: {
    countryCode: 'ZA',
    currency: 'ZAR',
    symbol: 'R',
    exchangeRateToKes: 7.0,
    base12mLocal: 150,
    base6mLocal: 80,
    discountUnit: 1,
    roundTo: 5,
  },
  UG: {
    countryCode: 'UG',
    currency: 'UGX',
    symbol: 'USh',
    exchangeRateToKes: 0.035,
    base12mLocal: 3000,
    base6mLocal: 2000,
    discountUnit: 1,
    roundTo: 100,
  },
  TZ: {
    countryCode: 'TZ',
    currency: 'TZS',
    symbol: 'TSh',
    exchangeRateToKes: 0.05,
    base12mLocal: 2000,
    base6mLocal: 1400,
    discountUnit: 1,
    roundTo: 100,
  },
  GH: {
    countryCode: 'GH',
    currency: 'GHS',
    symbol: 'GH₵',
    exchangeRateToKes: 10.0,
    base12mLocal: 80,
    base6mLocal: 40,
    discountUnit: 1,
    roundTo: 5,
  },
}

/**
 * Get client country code based on timezone
 */
export function getVisitorCountryCode(): string {
  if (typeof window === 'undefined') return 'KE'
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (!tz) return 'KE'

  if (tz.includes('Nairobi') || tz.includes('Mombasa')) return 'KE'
  if (tz.includes('Kampala')) return 'UG'
  if (tz.includes('Dar_es_Salaam')) return 'TZ'
  if (tz.includes('Kigali')) return 'RW'
  if (tz.includes('Lagos')) return 'NG'
  if (tz.includes('Johannesburg')) return 'ZA'
  if (tz.includes('Accra')) return 'GH'
  if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'IN'
  if (tz.includes('London')) return 'GB'
  if (tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid') || tz.includes('Amsterdam') || tz.includes('Brussels')) return 'EU'
  if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Denver') || tz.includes('Los_Angeles') || tz.includes('Anchorage') || tz.includes('Honolulu')) return 'US'

  // Default timezone offset heuristic
  const offset = new Date().getTimezoneOffset()
  if (offset === -180) return 'KE' // UTC+3
  return 'US' // Fallback to US/Global for high economic zone default
}

export interface CalculatedPrice {
  amountLocal: number
  amountKes: number
  currency: string
  symbol: string
  formattedLocal: string
}

/**
 * Calculate PPP pricing for the active plan
 */
export function calculatePPPPricedPlan(
  planPeriod: '6m' | '12m',
  countryCode: string
): CalculatedPrice {
  const config = PPP_CONFIGS[countryCode] || PPP_CONFIGS.US // Fallback to US/Global
  const rawLocal = planPeriod === '12m' ? config.base12mLocal : config.base6mLocal

  // Floor requirement: Lowest price is local equivalent of 100 shillings
  const floorLocalRaw = 100.0 / config.exchangeRateToKes
  // Round the floor value up based on country roundTo configuration
  const floorLocal = Math.ceil(floorLocalRaw / config.roundTo) * config.roundTo

  let localPrice = rawLocal
  if (localPrice < floorLocal) {
    localPrice = floorLocal
  }

  // Round off to look nice
  const roundedLocal = Math.round(localPrice / config.roundTo) * config.roundTo
  // Discount to end in ..9 something
  const discountedLocal = roundedLocal - config.discountUnit

  // Compute final KES value to be passed to payment gateway (since it accepts KES)
  const finalKes = discountedLocal * config.exchangeRateToKes

  return {
    amountLocal: discountedLocal,
    amountKes: Math.round(finalKes),
    currency: config.currency,
    symbol: config.symbol,
    formattedLocal: `${config.symbol} ${discountedLocal.toLocaleString()}`,
  }
}
