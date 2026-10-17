import { type FormEvent, useState } from 'react'
import { Download, Eye, Pencil, Plus, Trash2 } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SearchField } from '@/components/ui/search-field'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  type ContactMessageRecord,
  deleteContactMessage,
  exportContactMessages,
  listContactMessages,
  sendContactMessage,
  updateContactMessage,
} from '@/services/contact'
import { toastApiError } from '@/services/toast'

import { formatAdminDate } from '../_shared/adminListFormat'
import { AdminListPagination } from '../_shared/AdminListPagination'
import { IconAction } from '../_shared/adminListUtils'
import { usePagedAdminList } from '../_shared/usePagedAdminList'

export function ContactMessagesPage() {
  useDocumentTitle('Contact messages')

  const [viewing, setViewing] = useState<ContactMessageRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContactMessageRecord | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const list = usePagedAdminList<ContactMessageRecord>({
    fetchPage: listContactMessages,
    deleteRow: deleteContactMessage,
    exportRows: exportContactMessages,
    deleteSuccessMessage: 'Message deleted',
    deleteErrorMessage: 'Could not delete message',
    exportErrorMessage: 'Could not export messages',
    onDeleted: (row) => {
      setViewing((current) => (current?.id === row.id ? null : current))
    },
  })

  function openCreate() {
    setEditing(null)
    setName('')
    setEmail('')
    setSubject('')
    setMessage('')
    setFormOpen(true)
  }

  function openEdit(row: ContactMessageRecord) {
    setEditing(row)
    setName(row.name)
    setEmail(row.email)
    setSubject(row.subject ?? '')
    setMessage(row.message)
    setFormOpen(true)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateContactMessage(editing.id, {
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || null,
          message: message.trim(),
        })
        toast.success('Message updated')
      } else {
        await sendContactMessage({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || undefined,
          message: message.trim(),
        })
        toast.success('Message created')
      }
      setFormOpen(false)
      list.refresh()
    } catch (err) {
      toastApiError(err, 'Could not save message')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Contact messages"
        description="Messages from the public contact form — create, edit, delete, export."
        actions={
          <>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              New message
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={list.isExporting}
              onClick={list.handleExport}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Total messages</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{list.meta?.total ?? 0}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="messages-search">Search</FieldLabel>
            <SearchField
              id="messages-search"
              value={list.searchInput}
              onValueChange={list.setSearchInput}
              placeholder="Name, email, subject…"
              label="Search messages"
              className="max-w-md"
            />
          </Field>

          <AsyncState isLoading={list.isLoading} error={list.error} onRetry={list.refresh}>
            {list.rows.length === 0 ? (
              <EmptyState
                title="No messages yet"
                description="Contact form submissions will list here."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">From</th>
                        <th className="px-3 py-2 font-medium">Subject</th>
                        <th className="px-3 py-2 font-medium">Received</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.rows.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-muted-foreground">{row.email}</div>
                          </td>
                          <td className="px-3 py-2">{row.subject ?? '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatAdminDate(row.createdAt, true)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <IconAction label="View message" onClick={() => setViewing(row)}>
                                <Eye className="size-4" />
                              </IconAction>
                              <IconAction label="Edit message" onClick={() => openEdit(row)}>
                                <Pencil className="size-4" />
                              </IconAction>
                              <IconAction
                                label="Delete message"
                                tone="danger"
                                onClick={() => list.setPendingDelete(row)}
                              >
                                <Trash2 className="size-4" />
                              </IconAction>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <AdminListPagination
                  page={list.page}
                  meta={list.meta}
                  totalPages={list.totalPages}
                  rangeStart={list.rangeStart}
                  rangeEnd={list.rangeEnd}
                  onPageChange={list.setPage}
                />
              </>
            )}
          </AsyncState>
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit message' : 'Create message'}
        description="Admin write for contact messages."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="contact-message-form" disabled={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="contact-message-form" onSubmit={onSave} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="msg-name">Name</FieldLabel>
            <Input id="msg-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="msg-email">Email</FieldLabel>
            <Input
              id="msg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="msg-subject">Subject</FieldLabel>
            <Input id="msg-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="msg-body">Message</FieldLabel>
            <Textarea
              id="msg-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.subject?.trim() || 'Contact message'}
        description={
          viewing
            ? `${viewing.name} · ${viewing.email} · ${formatAdminDate(viewing.createdAt, true)}`
            : undefined
        }
        footer={
          viewing ? (
            <>
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  openEdit(viewing)
                  setViewing(null)
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  list.setPendingDelete(viewing)
                  setViewing(null)
                }}
              >
                Delete
              </Button>
            </>
          ) : undefined
        }
      >
        {viewing ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {viewing.message}
          </p>
        ) : null}
      </Dialog>

      <Dialog
        open={list.pendingDelete !== null}
        onClose={() => {
          if (!list.isActing) list.setPendingDelete(null)
        }}
        title="Delete message"
        description={
          list.pendingDelete
            ? `Delete the message from ${list.pendingDelete.name}? This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => list.setPendingDelete(null)}
              disabled={list.isActing}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={list.confirmDelete} disabled={list.isActing}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  )
}
