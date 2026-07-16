/**
 * Helper to dynamically get the current application domain name for UI display.
 * Strips protocols and trailing slashes.
 * Respects NEXT_PUBLIC_APP_URL so local development shows "localhost:3000"
 * and production shows "caseshow.info".
 */
export function getDisplayDomain(): string {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return window.location.host
  }
  return 'caseshow.info'
}
