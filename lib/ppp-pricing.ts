/**
 * Purchasing Power Parity (PPP) Pricing module
 * Kenyan Shilling (KES) is the baseline currency.
 * Minimum price is local equivalent of 100 KES (except for manually annealed KE pricing).
 */

export interface PricingConfig {
  countryCode: string
  currency: string
  symbol: string
  exchangeRateToKes: number // Multiply local currency by this to get KES
  base12mLocal: number
  base6mLocal: number
}

export const PPP_CONFIGS: Record<string, PricingConfig> = {
  KE: {
    countryCode: 'KE',
    currency: 'KES',
    symbol: 'KES',
    exchangeRateToKes: 1.0,
    base12mLocal: 100, // Manually annealed sweet spot
    base6mLocal: 70,   // Manually annealed sweet spot
  },
  US: {
    countryCode: 'US',
    currency: 'USD',
    symbol: '$',
    exchangeRateToKes: 130.0,
    base12mLocal: 19.99,
    base6mLocal: 10.99,
  },
  GB: {
    countryCode: 'GB',
    currency: 'GBP',
    symbol: '£',
    exchangeRateToKes: 165.0,
    base12mLocal: 15.99,
    base6mLocal: 8.99,
  },
  EU: {
    countryCode: 'EU',
    currency: 'EUR',
    symbol: '€',
    exchangeRateToKes: 140.0,
    base12mLocal: 17.99,
    base6mLocal: 9.99,
  },
  IN: {
    countryCode: 'IN',
    currency: 'INR',
    symbol: '₹',
    exchangeRateToKes: 1.55,
    base12mLocal: 499,
    base6mLocal: 299,
  },
  NG: {
    countryCode: 'NG',
    currency: 'NGN',
    symbol: '₦',
    exchangeRateToKes: 0.09,
    base12mLocal: 7999,
    base6mLocal: 4499,
  },
  ZA: {
    countryCode: 'ZA',
    currency: 'ZAR',
    symbol: 'R',
    exchangeRateToKes: 7.0,
    base12mLocal: 149,
    base6mLocal: 89,
  },
  UG: {
    countryCode: 'UG',
    currency: 'UGX',
    symbol: 'USh',
    exchangeRateToKes: 0.035,
    base12mLocal: 3999,  // above 100 KES baseline floor
    base6mLocal: 2999,   // above 100 KES baseline floor
  },
  TZ: {
    countryCode: 'TZ',
    currency: 'TZS',
    symbol: 'TSh',
    exchangeRateToKes: 0.05,
    base12mLocal: 2999,  // above 100 KES baseline floor
    base6mLocal: 1999,   // above 100 KES baseline floor
  },
  GH: {
    countryCode: 'GH',
    currency: 'GHS',
    symbol: 'GH₵',
    exchangeRateToKes: 10.0,
    base12mLocal: 79,
    base6mLocal: 49,
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
  const amountLocal = planPeriod === '12m' ? config.base12mLocal : config.base6mLocal

  // Final KES value to be passed to payment gateway (since it accepts KES)
  const finalKes = amountLocal * config.exchangeRateToKes

  return {
    amountLocal,
    amountKes: Math.round(finalKes),
    currency: config.currency,
    symbol: config.symbol,
    formattedLocal: `${config.symbol} ${amountLocal.toLocaleString()}`,
  }
}
