import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ActivityLog } from '@/services/activityLogs'

type ActivityLogDetailsDialogProps = {
  open: boolean
  log: ActivityLog | null
  onClose: () => void
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date)
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} readOnly />
    </Field>
  )
}

const ID_KEY = /^(id|uuid)$|(Id|_id|Uuid|_uuid)$/
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !(typeof item === 'string' && UUID_VALUE.test(item)))
      .map(stripIds)
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key, item]) => !ID_KEY.test(key) && !(typeof item === 'string' && UUID_VALUE.test(item)),
    )
    return Object.fromEntries(entries.map(([key, item]) => [key, stripIds(item)]))
  }
  return value
}

function formatMeta(meta: unknown): string {
  if (meta == null) return '—'
  if (typeof meta === 'string') return UUID_VALUE.test(meta) ? '—' : meta
  const cleaned = stripIds(meta)
  if (cleaned && typeof cleaned === 'object' && Object.keys(cleaned).length === 0) return '—'
  return JSON.stringify(cleaned, null, 2)
}

export function ActivityLogDetailsDialog({ open, log, onClose }: ActivityLogDetailsDialogProps) {
  const metaText = formatMeta(log?.meta)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Activity details"
      description={log ? log.action : undefined}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {log ? (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <DetailRow label="When" value={formatWhen(log.createdAt)} />
          <DetailRow label="Action" value={log.action} />
          <DetailRow label="Entity" value={log.entity ?? '—'} />
          <DetailRow
            label="User"
            value={log.user?.email ?? (log.userId ? 'Unknown user' : 'System / anonymous')}
          />
          <DetailRow label="User role" value={log.user?.role ? String(log.user.role) : '—'} />
          <DetailRow label="IP" value={log.ip ?? '—'} />
          <Field>
            <FieldLabel>Meta</FieldLabel>
            <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
              {metaText}
            </pre>
          </Field>
        </div>
      ) : null}
    </Dialog>
  )
}
