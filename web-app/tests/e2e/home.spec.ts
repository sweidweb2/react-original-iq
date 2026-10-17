import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('home links to the other public pages', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('heading', { name: 'Learn Smarter' })).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Public' })
    await nav.getByRole('link', { name: 'About' }).click()
    await expect(page.getByRole('heading', { name: 'About OriginaliQ' })).toBeVisible()

    await nav.getByRole('link', { name: 'Services' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: /Guiding every learner/ }),
    ).toBeVisible()

    await page
      .getByRole('navigation', { name: 'Support' })
      .getByRole('link', { name: 'FAQ' })
      .click()
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible()

    await nav.getByRole('link', { name: 'Contact' }).click()
    await expect(page.getByRole('heading', { name: 'Send Us a Message' })).toBeVisible()

    await nav.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByRole('heading', { name: 'Learn Smarter' })).toBeVisible()
  })

  test('navbar opens login and sign up', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('link', { name: 'Login' }).click()
    await expect(page.getByRole('heading', { name: 'Original IQ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    await page.getByRole('banner').getByRole('link', { name: 'Sign up' }).click()
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible()
  })
})
