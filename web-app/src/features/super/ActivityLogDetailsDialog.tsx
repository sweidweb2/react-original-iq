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

export function ActivityLogDetailsDialog({ open, log, onClose }: ActivityLogDetailsDialogProps) {
  const metaText =
    log?.meta == null
      ? '—'
      : typeof log.meta === 'string'
        ? log.meta
        : JSON.stringify(log.meta, null, 2)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Activity details"
      description={log ? log.action : undefined}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {log ? (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <DetailRow label="When" value={formatWhen(log.createdAt)} />
          <DetailRow label="Action" value={log.action} />
          <DetailRow label="Entity" value={log.entity ?? '—'} />
          <DetailRow label="Entity ID" value={log.entityId ?? '—'} />
          <DetailRow label="User" value={log.user?.email ?? log.userId ?? 'System / anonymous'} />
          <DetailRow label="User role" value={log.user?.role ? String(log.user.role) : '—'} />
          <DetailRow label="User ID" value={log.userId ?? '—'} />
          <DetailRow label="IP" value={log.ip ?? '—'} />
          <DetailRow label="Request ID" value={log.requestId ?? '—'} />
          <DetailRow label="Record ID" value={log.id} />
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
