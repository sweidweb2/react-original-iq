import { Copy } from 'lucide-react'

import { Field, FieldLabel } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { IconAction } from '@/components/ui/icon-action'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import type { ErrorLog } from '@/services/errorLogs'

type ErrorLogDetailsDialogProps = {
  open: boolean
  log: ErrorLog | null
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

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`)
  }
}

function DetailRow({
  label,
  value,
  copyable,
}: {
  label: string
  value: string
  copyable?: boolean
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input value={value} readOnly className="font-mono text-xs" />
        {copyable && value !== '—' ? (
          <IconAction
            label={`Copy ${label.toLowerCase()}`}
            onClick={() => void copyText(label, value)}
          >
            <Copy className="size-4" />
          </IconAction>
        ) : null}
      </div>
    </Field>
  )
}

function CodeBlock({ label, text }: { label: string; text: string }) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <IconAction
          label={`Copy ${label.toLowerCase()}`}
          onClick={() => void copyText(label, text)}
        >
          <Copy className="size-4" />
        </IconAction>
      </div>
      <pre
        dir="ltr"
        className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre"
      >
        {text}
      </pre>
    </Field>
  )
}

export function ErrorLogDetailsDialog({ open, log, onClose }: ErrorLogDetailsDialogProps) {
  const request = log?.method || log?.path ? `${log.method ?? ''} ${log.path ?? ''}`.trim() : '—'
  const metaText =
    log?.meta && Object.keys(log.meta).length > 0 ? JSON.stringify(log.meta, null, 2) : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Error details"
      description={log?.source ?? undefined}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {log ? (
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pe-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={log.level === 'warning' ? 'warning' : 'danger'}>{log.level}</Badge>
            {log.status ? <Badge tone="neutral">HTTP {log.status}</Badge> : null}
            {log.code ? <Badge tone="neutral">{log.code}</Badge> : null}
          </div>
          <Field>
            <FieldLabel>Message</FieldLabel>
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm break-words">
              {log.message}
            </p>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="When" value={formatWhen(log.createdAt)} />
            <DetailRow label="Request" value={request} />
            <DetailRow
              label="User"
              value={log.user?.email ?? (log.userId ? 'Unknown user' : 'System / anonymous')}
            />
            <DetailRow label="Request ID" value={log.requestId ?? '—'} copyable />
          </div>
          {metaText ? <CodeBlock label="Meta" text={metaText} /> : null}
          {log.stack ? <CodeBlock label="Stack" text={log.stack} /> : null}
        </div>
      ) : null}
    </Dialog>
  )
}
