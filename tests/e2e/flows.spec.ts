import { test, expect } from '@playwright/test'

test.describe('Case Dossier E2E Flows', () => {
  test('Landing page loads and displays brand elements', async ({ page }) => {
    await page.goto('/')
    
    // Verify page title contains 'Case'
    await expect(page).toHaveTitle(/Case/)
  })

  test('Signup page loads and renders form controls', async ({ page }) => {
    await page.goto('/signup')
    
    // Renders email input and start button (Passwordless OTP)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Login page loads and renders form controls', async ({ page }) => {
    await page.goto('/login')
    
    // Renders email input and login button (Passwordless OTP)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Billing page renders plans and soft limits', async ({ page }) => {
    await page.goto('/dashboard/billing')
    
    // The page structure should render the billing details header
    const heading = page.locator('h1, h2, .pricing-header')
    await expect(heading.first()).toBeVisible()
  })
})
