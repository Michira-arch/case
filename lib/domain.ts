/**
 * Helper to dynamically get the current application domain name for UI display.
 * Strips protocols and trailing slashes.
 * Respects NEXT_PUBLIC_APP_URL so local development shows "localhost:3000"
 * and production shows "caseshow.info".
 */
export function getDisplayDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info'
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
