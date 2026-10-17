import { expect, test } from '@playwright/test'

test.describe('i18n smoke (H1/H2)', () => {
  test('switching to Arabic flips to RTL and back to English restores LTR', async ({ page }) => {
    await page.goto('/en/services')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    await page.getByRole('banner').getByRole('link', { name: 'العربية' }).click()
    await expect(page).toHaveURL(/\/ar\/services$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.getByRole('heading', { level: 1, name: /نرافق كل متعلّم/ })).toBeVisible()

    await page.getByRole('banner').getByRole('link', { name: 'English' }).click()
    await expect(page).toHaveURL(/\/en\/services$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(
      page.getByRole('heading', { level: 1, name: /Guiding every learner/ }),
    ).toBeVisible()
  })

  test('remembers the chosen language for unprefixed URLs', async ({ page }) => {
    await page.goto('/ar/faq')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.goto('/contact')
    await expect(page).toHaveURL(/\/ar\/contact$/)
    await expect(page.getByRole('heading', { name: 'أرسل لنا رسالة' })).toBeVisible()
  })

  test('Arabic pages do not overflow on a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/ar', '/ar/about', '/ar/services', '/ar/contact', '/ar/terms']) {
      await page.goto(path)
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      expect(overflows, path).toBe(false)
    }
  })
})
