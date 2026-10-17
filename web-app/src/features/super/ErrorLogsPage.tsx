import { useEffect, useState } from 'react'
import { Bug, Eye } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { PageHeader } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconAction } from '@/components/ui/icon-action'
import { SearchField } from '@/components/ui/search-field'
import { Select } from '@/components/ui/select'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import {
  type ErrorLevel,
  type ErrorLog,
  type ErrorLogListMeta,
  type ErrorLogStats,
  getErrorLogStats,
  listErrorLogs,
} from '@/services/errorLogs'

import { ErrorLogDetailsDialog } from './ErrorLogDetailsDialog'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Prefixes of `source` values reported by the backend (`http`, `invoices.email`, …). */
const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'http', label: 'HTTP requests' },
  { value: 'process', label: 'Process crashes' },
  { value: 'startup', label: 'Startup' },
  { value: 'auth', label: 'Auth' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'payments', label: 'Payments' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'storage', label: 'Storage' },
  { value: 'backups', label: 'Backups' },
  { value: 'fx', label: 'Exchange rates' },
  { value: 'logging', label: 'Activity logging' },
] as const

const LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'error', label: 'Errors' },
  { value: 'warning', label: 'Warnings' },
] as const

type SinceFilter = '' | 'today' | 'week'

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

function sinceIso(filter: SinceFilter): string | undefined {
  if (filter === 'today') return startOfTodayIso()
  if (filter === 'week') return new Date(Date.now() - WEEK_MS).toISOString()
  return undefined
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

type Directory = {
  logs: ErrorLog[]
  meta: ErrorLogListMeta
  stats: ErrorLogStats
}

export function ErrorLogsPage() {
  useDocumentTitle('Error log')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [level, setLevel] = useState<'' | ErrorLevel>('')
  const [since, setSince] = useState<SinceFilter>('')
  const [reloadKey, setReloadKey] = useState(0)

  const [directory, setDirectory] = useState<Directory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [viewing, setViewing] = useState<ErrorLog | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search, source, level, since, limit])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      listErrorLogs({
        page,
        limit,
        search: search || undefined,
        source: source || undefined,
        level: level || undefined,
        since: sinceIso(since),
      }),
      getErrorLogStats(),
    ])
      .then(([list, stats]) => {
        if (cancelled) return
        const totalPages = Math.max(1, Math.ceil(list.meta.total / list.meta.limit))
        if (page > totalPages) {
          setPage(totalPages)
          return
        }
        setDirectory({ logs: list.data, meta: list.meta, stats })
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
  }, [page, limit, search, source, level, since, reloadKey])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  const stats = directory?.stats
  const meta = directory?.meta
  const logs = directory?.logs ?? []
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / limit))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  const filtersActive = Boolean(search || source || level || since)

  const statCards = [
    {
      key: 'total',
      label: 'Total',
      value: stats?.total ?? 0,
      pressed: !since && !level,
      onSelect: () => {
        setSince('')
        setLevel('')
      },
    },
    {
      key: 'today',
      label: 'Today',
      value: stats?.today ?? 0,
      pressed: since === 'today' && !level,
      onSelect: () => {
        setSince('today')
        setLevel('')
      },
    },
    {
      key: 'week',
      label: 'Last 7 days',
      value: stats?.lastWeek ?? 0,
      pressed: since === 'week' && !level,
      onSelect: () => {
        setSince('week')
        setLevel('')
      },
    },
    {
      key: 'errors',
      label: 'Errors',
      value: stats?.errors ?? 0,
      pressed: level === 'error' && !since,
      onSelect: () => {
        setSince('')
        setLevel('error')
      },
    },
    {
      key: 'warnings',
      label: 'Warnings',
      value: stats?.warnings ?? 0,
      pressed: level === 'warning' && !since,
      onSelect: () => {
        setSince('')
        setLevel('warning')
      },
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Error log"
        description="Unexpected backend failures: crashes, 5xx responses, and errors caught in background work. Handled validation and permission errors are not listed."
        actions={
          <Button type="button" variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <button
            key={card.key}
            type="button"
            aria-pressed={card.pressed}
            onClick={card.onSelect}
            className={cn(
              'rounded-lg border bg-card p-4 text-start shadow-sm transition',
              card.pressed
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/40',
            )}
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field className="sm:col-span-2 lg:col-span-1">
              <FieldLabel htmlFor="errors-search">Search</FieldLabel>
              <SearchField
                id="errors-search"
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="Message, code, path, request ID…"
                label="Search errors"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="errors-source">Source</FieldLabel>
              <Select
                id="errors-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="errors-level">Level</FieldLabel>
              <Select
                id="errors-level"
                value={level}
                onChange={(event) => setLevel(event.target.value as '' | ErrorLevel)}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="errors-limit">Rows</FieldLabel>
              <Select
                id="errors-limit"
                value={String(limit)}
                onChange={(event) =>
                  setLimit(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                }
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <AsyncState
            isLoading={isLoading && !directory}
            error={error}
            onRetry={refresh}
            loadingFallback={
              <div className="flex flex-col gap-2" role="status" aria-label="Loading errors">
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
              </div>
            }
          >
            {logs.length === 0 ? (
              <EmptyState
                icon={<Bug className="size-6" aria-hidden />}
                title="No errors found"
                description={
                  filtersActive
                    ? 'Try a different search or clear the filters.'
                    : 'Unexpected failures appear here as soon as the backend reports them.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-start text-sm">
                  <caption className="sr-only">Error logs</caption>
                  <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-2 py-2 text-start font-medium">When</th>
                      <th className="px-2 py-2 text-start font-medium">Level</th>
                      <th className="px-2 py-2 text-start font-medium">Source</th>
                      <th className="px-2 py-2 text-start font-medium">Message</th>
                      <th className="px-2 py-2 text-start font-medium">Request</th>
                      <th className="px-2 py-2 text-start font-medium">Status</th>
                      <th className="px-2 py-2 text-start font-medium">User</th>
                      <th className="px-2 py-2 text-center font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                          {formatWhen(log.createdAt)}
                        </td>
                        <td className="px-2 py-3">
                          <Badge tone={log.level === 'warning' ? 'warning' : 'danger'}>
                            {log.level}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 font-mono text-xs whitespace-nowrap">
                          {log.source ?? '—'}
                        </td>
                        <td className="max-w-[320px] truncate px-2 py-3" title={log.message}>
                          {log.message}
                        </td>
                        <td
                          className="max-w-[220px] truncate px-2 py-3 font-mono text-xs text-muted-foreground"
                          title={log.path ?? undefined}
                        >
                          {log.method || log.path
                            ? `${log.method ?? ''} ${log.path ?? ''}`.trim()
                            : '—'}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">{log.status ?? '—'}</td>
                        <td className="max-w-[200px] truncate px-2 py-3 text-muted-foreground">
                          {log.user?.email ?? (log.userId ? 'Unknown user' : 'System')}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-center">
                            <IconAction label="View details" onClick={() => setViewing(log)}>
                              <Eye className="size-4" />
                            </IconAction>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {meta && meta.total > 0
                  ? `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`
                  : 'Showing 0 errors'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </Button>
                <span className="min-w-24 text-center text-sm text-muted-foreground">
                  Page {meta?.page ?? page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </AsyncState>
        </CardContent>
      </Card>

      <ErrorLogDetailsDialog
        open={viewing !== null}
        log={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}
