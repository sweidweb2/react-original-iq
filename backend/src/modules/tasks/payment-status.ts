import type { TaskPaymentStatus } from './tasks.types.js'

/** All amounts in integer minor units of the ledger currency. */
export type TaskMoneyTotals = {
  priceMinor: number
  paidMinor: number
  refundedMinor: number
  hasPendingRefund: boolean
}

/**
 * Doc 06: net = paid payments − paid refunds; due = price − net.
 * - a pending refund, or net above the price (including any net on a free task) → `refund_pending`
 * - due = 0 → `paid` (a free task with nothing paid is paid)
 * - due > 0 → `unpaid`, which also covers a negative net (refunds above payments)
 */
export function derivePaymentStatus(totals: TaskMoneyTotals): TaskPaymentStatus {
  if (totals.hasPendingRefund) return 'refund_pending'
  const dueMinor = totals.priceMinor - (totals.paidMinor - totals.refundedMinor)
  if (dueMinor < 0) return 'refund_pending'
  return dueMinor === 0 ? 'paid' : 'unpaid'
}
