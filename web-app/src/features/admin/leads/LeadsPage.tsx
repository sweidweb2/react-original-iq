import { type ReactNode, useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { SearchField } from '@/components/ui/search-field'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  deleteLead,
  exportLeads,
  listLeads,
  type ContactListMeta,
  type LeadRecord,
} from '@/services/contact'
import { toastApiError } from '@/services/toast'

const PAGE_SIZE = 10

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted"
      >
        {children}
      </button>
    </Tooltip>
  )
}

export function LeadsPage() {
  useDocumentTitle('Leads')

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [rows, setRows] = useState<LeadRecord[]>([])
  const [meta, setMeta] = useState<ContactListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [pendingDelete, setPendingDelete] = useState<LeadRecord | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listLeads({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((result) => {
        if (cancelled) return
        const totalPages = Math.max(1, Math.ceil(result.meta.total / result.meta.limit))
        if (page > totalPages) {
          setPage(totalPages)
          return
        }
        setRows(result.data)
        setMeta(result.meta)
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, reloadKey])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setIsActing(true)
    try {
      await deleteLead(pendingDelete.id)
      toast.success('Lead deleted')
      setPendingDelete(null)
      refresh()
    } catch (actionError) {
      toastApiError(actionError, 'Could not delete lead')
    } finally {
      setIsActing(false)
    }
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportLeads(search || undefined)
      toast.success('Export started')
    } catch (exportError) {
      toastApiError(exportError, 'Could not export leads')
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / PAGE_SIZE))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Leads"
        description="Home lead modal submissions — search, delete, and export."
        actions={
          <Button type="button" variant="outline" size="sm" disabled={isExporting} onClick={handleExport}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <button
        type="button"
        className="rounded-lg border border-border bg-card p-4 text-left shadow-sm"
        onClick={() => setSearchInput('')}
      >
        <p className="text-sm text-muted-foreground">Total leads</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{meta?.total ?? 0}</p>
      </button>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="leads-search">Search</FieldLabel>
            <SearchField
              id="leads-search"
              value={searchInput}
              onValueChange={setSearchInput}
              placeholder="Phone, country, email…"
              label="Search leads"
              className="max-w-md"
            />
          </Field>

          <AsyncState isLoading={isLoading} error={error} onRetry={refresh}>
            {rows.length === 0 ? (
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
                      {rows.map((lead) => (
                        <tr key={lead.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{lead.phone ?? '—'}</td>
                          <td className="px-3 py-2">{lead.country ?? '—'}</td>
                          <td className="px-3 py-2">{lead.email ?? '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              <IconAction label="Delete lead" onClick={() => setPendingDelete(lead)}>
                                <Trash2 className="size-4" />
                              </IconAction>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {meta && meta.total > 0
                      ? `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`
                      : 'No results'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {meta?.page ?? page} of {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </AsyncState>
        </CardContent>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!isActing) setPendingDelete(null)
        }}
        title="Delete lead"
        description={
          pendingDelete
            ? `Remove the lead from ${pendingDelete.country ?? 'unknown country'} (${pendingDelete.phone ?? 'no phone'})? This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={isActing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isActing}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  )
}
