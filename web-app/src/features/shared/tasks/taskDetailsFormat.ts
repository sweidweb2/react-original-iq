import type { RevisionStatus } from '@/services/revisions'
import type { TaskPaymentStatus, TaskStatus } from '@/services/tasks'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const REVISION_STATUS_TONE: Record<RevisionStatus, Tone> = {
  'in-revision': 'primary',
  waiting_coordinator_approval: 'warning',
  completed: 'success',
  cancelled: 'danger',
}

export function revisionStatusTone(status: RevisionStatus): Tone {
  return REVISION_STATUS_TONE[status] ?? 'neutral'
}

const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  pending: 'neutral',
  'in-progress': 'primary',
  waiting_coordinator_approval: 'warning',
  completed: 'success',
  cancelled: 'danger',
}

const PAYMENT_STATUS_TONE: Record<TaskPaymentStatus, Tone> = {
  unpaid: 'neutral',
  paid: 'success',
  refund_pending: 'warning',
}

const PAYMENT_STATUS_LABEL: Record<TaskPaymentStatus, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  refund_pending: 'Refund pending',
}

export function taskStatusTone(status: TaskStatus): Tone {
  return TASK_STATUS_TONE[status] ?? 'neutral'
}

export function paymentStatusTone(status: TaskPaymentStatus): Tone {
  return PAYMENT_STATUS_TONE[status] ?? 'neutral'
}

export function paymentStatusLabel(status: TaskPaymentStatus): string {
  return PAYMENT_STATUS_LABEL[status] ?? status
}

export function formatTaskDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]?/gi

export function fileDisplayName(location: string, fallback = 'File'): string {
  const path = location.split(/[?#]/)[0] ?? ''
  const segment = path.split('/').filter(Boolean).pop() ?? ''
  let name = segment
  try {
    name = decodeURIComponent(segment)
  } catch {
    // keep the raw segment when it is not valid URI encoding
  }
  name = name.replace(UUID_PATTERN, '').trim()
  return name || fallback
}

export function storedFileName(
  file: { originalName: string | null; fileLocation: string },
  fallback = 'File',
): string {
  return file.originalName || fileDisplayName(file.fileLocation, fallback)
}

export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
