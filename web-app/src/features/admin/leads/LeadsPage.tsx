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
  createLead,
  deleteLead,
  exportLeads,
  type LeadRecord,
  listLeads,
  updateLead,
} from '@/services/contact'
import { toastApiError } from '@/services/toast'

import { formatAdminDate } from '../_shared/adminListFormat'
import { AdminListPagination } from '../_shared/AdminListPagination'
import { IconAction } from '../_shared/adminListUtils'
import { usePagedAdminList } from '../_shared/usePagedAdminList'

export function LeadsPage() {
  useDocumentTitle('Leads')

  const list = usePagedAdminList<LeadRecord>({
    fetchPage: listLeads,
    deleteRow: deleteLead,
    exportRows: exportLeads,
    deleteSuccessMessage: 'Lead deleted',
    deleteErrorMessage: 'Could not delete lead',
    exportErrorMessage: 'Could not export leads',
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LeadRecord | null>(null)
  const [country, setCountry] = useState('')
  const [dialCode, setDialCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setCountry('')
    setDialCode('+1')
    setPhone('')
    setEmail('')
    setFormOpen(true)
  }

  function openEdit(lead: LeadRecord) {
    setEditing(lead)
    setCountry(lead.country ?? '')
    setDialCode('+')
    setPhone(lead.phone ?? '')
    setEmail(lead.email ?? '')
    setFormOpen(true)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateLead(editing.id, {
          country: country.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
        })
        toast.success('Lead updated')
      } else {
        await createLead({
          country: country.trim(),
          dialCode: dialCode.trim() || '+',
          phone: phone.trim(),
        })
        toast.success('Lead created')
      }
      setFormOpen(false)
      list.refresh()
    } catch (err) {
      toastApiError(err, 'Could not save lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Leads"
        description="Home lead modal submissions — search, create, edit, delete, and export."
        actions={
          <>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              New lead
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

      <button
        type="button"
        className="rounded-lg border border-border bg-card p-4 text-left shadow-sm"
        onClick={() => list.setSearchInput('')}
      >
        <p className="text-sm text-muted-foreground">Total leads</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{list.meta?.total ?? 0}</p>
      </button>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="leads-search">Search</FieldLabel>
            <SearchField
              id="leads-search"
              value={list.searchInput}
              onValueChange={list.setSearchInput}
              placeholder="Phone, country, email…"
              label="Search leads"
              className="max-w-md"
            />
          </Field>

          <AsyncState isLoading={list.isLoading} error={list.error} onRetry={list.refresh}>
            {list.rows.length === 0 ? (
              <EmptyState
                title="No leads yet"
                description="Home lead modal submissions will appear in this table."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium">Country</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.rows.map((lead) => (
                        <tr key={lead.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{lead.phone ?? '—'}</td>
                          <td className="px-3 py-2">{lead.country ?? '—'}</td>
                          <td className="px-3 py-2">{lead.email ?? '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatAdminDate(lead.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <IconAction label="Edit lead" onClick={() => openEdit(lead)}>
                                <Pencil className="size-4" />
                              </IconAction>
                              <IconAction
                                label="Delete lead"
                                tone="danger"
                                onClick={() => list.setPendingDelete(lead)}
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
        title={editing ? 'Edit lead' : 'Create lead'}
        description="Admin write for CRM leads."
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
            <Button type="submit" form="lead-form" disabled={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="lead-form" onSubmit={onSave} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="lead-country">Country</FieldLabel>
            <Input
              id="lead-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </Field>
          {!editing ? (
            <Field>
              <FieldLabel htmlFor="lead-dial">Dial code</FieldLabel>
              <Input
                id="lead-dial"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                required
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="lead-phone">Phone</FieldLabel>
            <Input
              id="lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
          {editing ? (
            <Field>
              <FieldLabel htmlFor="lead-email">Email</FieldLabel>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={list.pendingDelete !== null}
        onClose={() => {
          if (!list.isActing) list.setPendingDelete(null)
        }}
        title="Delete lead"
        description={
          list.pendingDelete
            ? `Remove the lead from ${list.pendingDelete.country ?? 'unknown country'} (${list.pendingDelete.phone ?? 'no phone'})? This cannot be undone.`
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
