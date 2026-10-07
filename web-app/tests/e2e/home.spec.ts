import { expect, test } from '@playwright/test'

test.describe('web e2e (auth smoke)', () => {
  test('login page is the entry experience', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('can open register from login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Register' }).click()
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  })
})
