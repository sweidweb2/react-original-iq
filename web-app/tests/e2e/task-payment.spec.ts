import { expect, type Page, test } from '@playwright/test'

const password = 'password'

async function signIn(page: Page, email: string) {
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** `datetime-local` value two weeks out, in the browser's local time. */
function futureDeadline(): string {
  const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T12:00`
}

test('client creates a task, pays the simulated checkout, and gets an invoice', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const topic = `E2E payment ${Date.now()}`

  await page.goto('/')
  await signIn(page, 'client@original-iq.com')
  await expect(page.getByRole('heading', { name: 'Client dashboard' })).toBeVisible()

  await page.goto('/client/tasks')
  await page.getByRole('button', { name: 'New task' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Create task' })
  await createDialog.getByLabel('Topic').fill(topic)
  await createDialog.getByLabel('Category').fill('Mathematics')
  await createDialog.getByLabel('Deadline').fill(futureDeadline())
  await createDialog.getByLabel('Description').fill('Prove the payment journey works.')
  await createDialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText(`“${topic}” was added to the task list.`)).toBeVisible()

  const row = page.getByRole('row').filter({ hasText: topic })
  await expect(row).toContainText('$0.00')
  await row.getByRole('link', { name: 'Open' }).click()
  await expect(page).toHaveURL(/\/client\/tasks\/[^/]+$/)
  const taskId = new URL(page.url()).pathname.split('/').pop() ?? ''
  expect(taskId).not.toBe('')

  await signIn(page, 'admin@original-iq.com')
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await page.goto(`/admin/tasks/${taskId}?tab=payments`)
  await page.getByRole('button', { name: 'Edit price' }).click()
  const priceDialog = page.getByRole('dialog', { name: 'Edit price' })
  await priceDialog.getByLabel('Price (USD)').fill('49.99')
  await priceDialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('$0.00 → $49.99.')).toBeVisible()
  await expect(priceDialog).toBeHidden()

  await signIn(page, 'client@original-iq.com')
  await expect(page.getByRole('heading', { name: 'Client dashboard' })).toBeVisible()
  await page.goto(`/client/tasks/${taskId}/payments`)
  await expect(page.getByText('No payments yet')).toBeVisible()

  await page.getByRole('button', { name: 'Pay now' }).click()
  const checkout = page.getByRole('dialog', { name: 'Pay for this task' })
  await expect(checkout.getByLabel('Amount (USD)')).toHaveValue('49.99')
  await checkout.getByLabel('Cardholder name').fill('Client User')
  await checkout.getByLabel('Card number').fill('4242424242424242')
  await expect(checkout.getByLabel('Card number')).toHaveValue('4242 4242 4242 4242')
  await checkout.getByLabel('Expiry').fill('1230')
  await expect(checkout.getByLabel('Expiry')).toHaveValue('12/30')
  await checkout.getByLabel('CVC').fill('123')
  await checkout.getByRole('button', { name: 'Pay $49.99' }).click()

  await expect(page.getByText(/^\$49\.99 paid\. Invoice INV-\d{6} was created\.$/)).toBeVisible()
  await expect(checkout).toBeHidden()

  const payments = page.getByRole('table', { name: 'Payments' })
  const paymentRow = payments.getByRole('row').filter({ hasText: '$49.99' })
  await expect(paymentRow).toHaveCount(1)
  await expect(paymentRow).toContainText('card')
  await expect(paymentRow).toContainText('paid')
  await expect(paymentRow).toContainText(/INV-\d{6}/)

  await expect(page.getByText('Status:')).toContainText('Paid')
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeHidden()
})
