import { createHash, timingSafeEqual } from 'node:crypto'

import type { MontyPayConfig } from '../../config/index.js'
import { LEDGER_CURRENCY } from './payments.types.js'

const ORDER_NUMBER =
  /^TASK_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d+)$/i

/** sha1(md5(upper(parts joined))). md5 is the hex digest, matching MontyPay's PHP `sha1(md5(...))`. */
export function montyPayHash(parts: readonly string[]): string {
  const material = parts.join('').toUpperCase()
  const md5 = createHash('md5').update(material, 'utf8').digest('hex')
  return createHash('sha1').update(md5, 'utf8').digest('hex')
}

export function formatGatewayAmount(amount: number): string {
  return amount.toFixed(2)
}

export function checkoutOrderNumber(taskId: string, now = Date.now()): string {
  return `TASK_${taskId}_${now}`
}

export function checkoutOrderDescription(taskId: string): string {
  return `Task ${taskId}`
}

export function parseCheckoutOrderNumber(value: string): { taskId: string } | null {
  const match = ORDER_NUMBER.exec(value.trim())
  if (!match?.[1]) return null
  return { taskId: match[1].toLowerCase() }
}

export function payerDisplayName(
  profile: {
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null,
): string {
  const display = profile?.displayName?.trim()
  if (display) return display
  const joined = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
  return joined || 'Customer'
}

export function returnUrl(origin: string, taskId: string, result: 'success' | 'cancel'): string {
  return `${origin.replace(/\/$/, '')}/tasks/${taskId}/payments?checkout=${result}`
}

export function secretsMatch(expected: string, provided: string | undefined): boolean {
  if (!provided) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(provided)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function hashesMatch(expected: string, provided: string): boolean {
  const left = Buffer.from(expected.toLowerCase())
  const right = Buffer.from(provided.trim().toLowerCase())
  if (left.length !== right.length || left.length === 0) return false
  return timingSafeEqual(left, right)
}

export class MontyPayGatewayError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MontyPayGatewayError'
  }
}

export type MontyPaySessionInput = {
  config: MontyPayConfig
  orderNumber: string
  amount: string
  description: string
  successUrl: string
  cancelUrl: string
  customerName: string
  customerEmail: string
  fetchImpl?: typeof fetch
}

/** Hosted checkout. Card numbers never reach this server. */
export async function createMontyPaySession(input: MontyPaySessionInput): Promise<string> {
  const currency = LEDGER_CURRENCY
  const hash = montyPayHash([
    input.orderNumber,
    input.amount,
    currency,
    input.description,
    input.config.merchantPassword,
  ])
  const body = {
    merchant_key: input.config.merchantKey,
    operation: 'purchase',
    methods: ['card'],
    order: {
      number: input.orderNumber,
      amount: input.amount,
      currency,
      description: input.description,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer: {
      name: input.customerName,
      email: input.customerEmail,
    },
    hash,
  }

  let response: Response
  try {
    response = await (input.fetchImpl ?? fetch)(input.config.apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request failed'
    throw new MontyPayGatewayError(`MontyPay session request failed: ${reason}`)
  }

  const payload: unknown = await response.json().catch(() => null)
  const redirectUrl = readRedirectUrl(payload)
  if (!response.ok || !redirectUrl) {
    throw new MontyPayGatewayError(
      `MontyPay session was rejected (${response.status}, keys: ${objectKeys(payload).join(',') || 'none'})`,
    )
  }
  return redirectUrl
}

function readRedirectUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const value = (payload as { redirect_url?: unknown }).redirect_url
  if (typeof value !== 'string' || !/^https:\/\//i.test(value)) return null
  return value
}

function objectKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  return Object.keys(payload)
}

export type MontyPayCallbackFields = {
  id: string
  orderNumber: string
  orderAmount: string
  orderCurrency: string
  orderDescription: string
  orderStatus: string
  status: string
  hash: string
}

/** Reads callback strings without coercing the amount (the hash covers the raw text). */
export function readCallbackFields(body: unknown): MontyPayCallbackFields | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const fields = {
    id: asString(record.id),
    orderNumber: asString(record.order_number),
    orderAmount: asString(record.order_amount),
    orderCurrency: asString(record.order_currency),
    orderDescription: asString(record.order_description),
    orderStatus: asString(record.order_status),
    status: asString(record.status),
    hash: asString(record.hash),
  }
  if (!fields.hash) return null
  return fields
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Positive amount with at most 2 decimal places, as sent by the gateway. */
export function parseCallbackAmount(raw: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0.01) return null
  return value
}
