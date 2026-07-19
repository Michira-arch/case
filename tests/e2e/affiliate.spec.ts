import { test, expect } from '@playwright/test'

test.describe('Affiliate Marketing E2E Flows', () => {
  test('Referral link sets cookie and redirects to home page', async ({ page, context }) => {
    // 1. Visit the referral route
    await page.goto('/ref/testcode')

    // 2. Expect redirection to home page
    await expect(page).toHaveURL('/')

    // 3. Verify cookie is set
    const cookies = await context.cookies()
    const refCookie = cookies.find(c => c.name === 'ref_code')
    expect(refCookie).toBeDefined()
    expect(refCookie?.value).toBe('testcode')
  })

  test('Affiliate dashboard is protected and redirects unauthenticated users to login', async ({ page }) => {
    // 1. Go to affiliate dashboard page
    await page.goto('/dashboard/affiliate')

    // 2. Expect redirect to login with correct redirection parameter
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard%2Faffiliate/)
  })
})
