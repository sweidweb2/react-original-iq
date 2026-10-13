import { expect, type Page, test } from '@playwright/test'

const password = 'password'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('auth flows', () => {
  test('signed-out visit to a portal opens sign in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Original IQ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('register lands on the client portal', async ({ page }) => {
    const email = `e2e-${Date.now()}@originaliq.test`
    await page.goto('/register')
    await page.getByLabel('First name').fill('Ada')
    await page.getByLabel('Last name').fill('Lovelace')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('textbox', { name: 'Password' }).fill('password1')
    await page.getByRole('button', { name: 'Sign up' }).click()

    await expect(page.getByRole('heading', { name: 'Client home' })).toBeVisible()
    await expect(page).toHaveURL(/\/client$/)
  })

  test('each role lands on its portal', async ({ page }) => {
    test.setTimeout(60_000)
    const portals = [
      { email: 'admin@original-iq.com', heading: 'Admin home', path: /\/admin$/ },
      { email: 'coordinator@original-iq.com', heading: 'Coordinator home', path: /\/coordinator$/ },
      { email: 'tutor@original-iq.com', heading: 'Tutor home', path: /\/tutor$/ },
      { email: 'client@original-iq.com', heading: 'Client home', path: /\/client$/ },
    ]

    for (const portal of portals) {
      await signIn(page, portal.email)
      await expect(page.getByRole('heading', { name: portal.heading })).toBeVisible()
      await expect(page).toHaveURL(portal.path)
      await page.evaluate(() => localStorage.clear())
    }
  })

  test('a client cannot open the admin portal', async ({ page }) => {
    await signIn(page, 'client@original-iq.com')
    await expect(page.getByRole('heading', { name: 'Client home' })).toBeVisible()

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Learn Smarter' })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('sign out returns to sign in', async ({ page }) => {
    await signIn(page, 'client@original-iq.com')
    await expect(page.getByRole('heading', { name: 'Client home' })).toBeVisible()

    await page.getByRole('button', { name: 'Account menu for Client User' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()

    await expect(page.getByRole('heading', { name: 'Original IQ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })
})
