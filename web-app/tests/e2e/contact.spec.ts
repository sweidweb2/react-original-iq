import { expect, test } from '@playwright/test'

test.describe('contact page', () => {
  test('sends a message, subscribes, and opens the FAQ', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: 'Visit Us' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Email Us' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Call Us' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Send Us a Message' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Stay Updated' })).toBeVisible()
    await expect(page.getByTitle('Original IQ on the map')).toBeVisible()

    await page.getByLabel('Your Name *').fill('')
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByText('Your name is required')).toBeVisible()

    await page.getByLabel('Your Name *').fill('Ada')
    await page.getByLabel('Email Address *').fill('ada@example.com')
    await page.getByLabel('Subject').fill('Tutoring')
    await page.getByLabel('Message *').fill('I need help with calculus.')
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(
      page.getByText("Message sent successfully! We'll get back to you soon."),
    ).toBeVisible()

    await page.getByPlaceholder('Enter your email address').fill('news@example.com')
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect(page.getByText("You're subscribed")).toBeVisible()

    await page.getByRole('link', { name: 'Visit FAQ' }).click()
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible()
  })

  test('keeps the contact sections on a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: 'Send Us a Message' })).toBeVisible()
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflows).toBe(false)
  })
})
