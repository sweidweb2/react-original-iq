import { type FormEvent, useState } from 'react'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SearchField } from '@/components/ui/search-field'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  deleteNewsletterSubscriber,
  exportNewsletter,
  listNewsletter,
  subscribeNewsletter,
  type StayUpdatedRecord,
  updateNewsletterSubscriber,
} from '@/services/contact'
import { toastApiError } from '@/services/toast'

import { AdminListPagination } from '../_shared/AdminListPagination'
import { formatAdminDate, IconAction } from '../_shared/adminListUtils'
import { usePagedAdminList } from '../_shared/usePagedAdminList'

export function StayUpdatedPage() {
  useDocumentTitle('Stay updated')

  const list = usePagedAdminList<StayUpdatedRecord>({
    fetchPage: listNewsletter,
    deleteRow: deleteNewsletterSubscriber,
    exportRows: exportNewsletter,
    deleteSuccessMessage: 'Subscriber removed',
    deleteErrorMessage: 'Could not remove subscriber',
    exportErrorMessage: 'Could not export subscribers',
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StayUpdatedRecord | null>(null)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setEmail('')
    setFormOpen(true)
  }

  function openEdit(row: StayUpdatedRecord) {
    setEditing(row)
    setEmail(row.email)
    setFormOpen(true)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateNewsletterSubscriber(editing.id, email.trim())
        toast.success('Subscriber updated')
      } else {
        await subscribeNewsletter(email.trim())
        toast.success('Subscriber added')
      }
      setFormOpen(false)
      list.refresh()
    } catch (err) {
      toastApiError(err, 'Could not save subscriber')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Stay updated"
        description="Newsletter sign-ups — create, edit, remove, export."
        actions={
          <>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Add email
            </Button>
            <Button
              type="button"
              variant="outline"
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
        <p className="text-sm text-muted-foreground">Total subscribers</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{list.meta?.total ?? 0}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="newsletter-search">Search</FieldLabel>
            <SearchField
              id="newsletter-search"
              value={list.searchInput}
              onValueChange={list.setSearchInput}
              placeholder="Email address…"
              label="Search subscribers"
              className="max-w-md"
            />
          </Field>

          <AsyncState isLoading={list.isLoading} error={list.error} onRetry={list.refresh}>
            {list.rows.length === 0 ? (
              <EmptyState
                title="No subscribers yet"
                description="Stay-updated signups will appear here."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Subscribed</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.rows.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatAdminDate(row.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <IconAction label="Edit subscriber" onClick={() => openEdit(row)}>
                                <Pencil className="size-4" />
                              </IconAction>
                              <IconAction
                                label="Remove subscriber"
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
        title={editing ? 'Edit subscriber' : 'Add subscriber'}
        description="Admin write for stay-updated emails."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="newsletter-form" disabled={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="newsletter-form" onSubmit={onSave} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="newsletter-email">Email</FieldLabel>
            <Input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={list.pendingDelete !== null}
        onClose={() => {
          if (!list.isActing) list.setPendingDelete(null)
        }}
        title="Remove subscriber"
        description={
          list.pendingDelete
            ? `Remove ${list.pendingDelete.email} from the stay-updated list? This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => list.setPendingDelete(null)}
              disabled={list.isActing}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={list.confirmDelete} disabled={list.isActing}>
              Remove
            </Button>
          </>
        }
      />
    </div>
  )
}
