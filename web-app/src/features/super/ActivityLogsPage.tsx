import { useEffect, useState } from 'react'
import { Eye, ScrollText } from 'lucide-react'

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
  type ActivityLog,
  type ActivityLogListMeta,
  type ActivityLogStats,
  getActivityLogStats,
  listActivityLogs,
} from '@/services/activityLogs'

import { ActivityLogDetailsDialog } from './ActivityLogDetailsDialog'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

const ACTION_PREFIX_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'auth.', label: 'Auth' },
  { value: 'users.', label: 'Users' },
  { value: 'rbac.', label: 'RBAC' },
] as const

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'user', label: 'User' },
  { value: 'role', label: 'Role' },
  { value: 'permission', label: 'Permission' },
] as const

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
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
  logs: ActivityLog[]
  meta: ActivityLogListMeta
  stats: ActivityLogStats
}

export function ActivityLogsPage() {
  useDocumentTitle('Activity log')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [actionPrefix, setActionPrefix] = useState('')
  const [entity, setEntity] = useState('')
  const [sinceToday, setSinceToday] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [directory, setDirectory] = useState<Directory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [viewing, setViewing] = useState<ActivityLog | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search, actionPrefix, entity, sinceToday, limit])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      listActivityLogs({
        page,
        limit,
        search: search || undefined,
        actionPrefix: actionPrefix || undefined,
        entity: entity || undefined,
        since: sinceToday ? startOfTodayIso() : undefined,
      }),
      getActivityLogStats(),
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
  }, [page, limit, search, actionPrefix, entity, sinceToday, reloadKey])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  const stats = directory?.stats
  const meta = directory?.meta
  const logs = directory?.logs ?? []
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / limit))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  const filtersActive = Boolean(search || actionPrefix || entity || sinceToday)

  const statCards = [
    {
      key: 'total',
      label: 'Total',
      value: stats?.total ?? 0,
      pressed: !actionPrefix && !sinceToday,
      onSelect: () => {
        setActionPrefix('')
        setSinceToday(false)
      },
    },
    {
      key: 'today',
      label: 'Today',
      value: stats?.today ?? 0,
      pressed: sinceToday && !actionPrefix,
      onSelect: () => {
        setActionPrefix('')
        setSinceToday(true)
      },
    },
    {
      key: 'auth',
      label: 'Auth',
      value: stats?.auth ?? 0,
      pressed: actionPrefix === 'auth.' && !sinceToday,
      onSelect: () => {
        setActionPrefix('auth.')
        setSinceToday(false)
      },
    },
    {
      key: 'users',
      label: 'Users',
      value: stats?.users ?? 0,
      pressed: actionPrefix === 'users.' && !sinceToday,
      onSelect: () => {
        setActionPrefix('users.')
        setSinceToday(false)
      },
    },
    {
      key: 'rbac',
      label: 'RBAC',
      value: stats?.rbac ?? 0,
      pressed: actionPrefix === 'rbac.' && !sinceToday,
      onSelect: () => {
        setActionPrefix('rbac.')
        setSinceToday(false)
      },
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Activity log"
        description="Audit trail of sign-ins, user changes, and RBAC updates."
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
              'rounded-lg border bg-card p-4 text-left shadow-sm transition',
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
              <FieldLabel htmlFor="activity-search">Search</FieldLabel>
              <SearchField
                id="activity-search"
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="Action, entity, IP…"
                label="Search activity"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-action">Action</FieldLabel>
              <Select
                id="activity-action"
                value={actionPrefix}
                onChange={(event) => setActionPrefix(event.target.value)}
              >
                {ACTION_PREFIX_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-entity">Entity</FieldLabel>
              <Select
                id="activity-entity"
                value={entity}
                onChange={(event) => setEntity(event.target.value)}
              >
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="activity-limit">Rows</FieldLabel>
              <Select
                id="activity-limit"
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
              <div className="flex flex-col gap-2" role="status" aria-label="Loading activity">
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
              </div>
            }
          >
            {logs.length === 0 ? (
              <EmptyState
                icon={<ScrollText className="size-6" aria-hidden />}
                title="No activity found"
                description={
                  filtersActive
                    ? 'Try a different search or clear the filters.'
                    : 'Events appear here when users register, log in, or admins change accounts and RBAC.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <caption className="sr-only">Activity logs</caption>
                  <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-2 py-2 font-medium">When</th>
                      <th className="px-2 py-2 font-medium">Action</th>
                      <th className="px-2 py-2 font-medium">Entity</th>
                      <th className="px-2 py-2 font-medium">User</th>
                      <th className="px-2 py-2 font-medium">IP</th>
                      <th className="px-2 py-2 text-center font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                          {formatWhen(log.createdAt)}
                        </td>
                        <td className="px-2 py-3 font-medium">{log.action}</td>
                        <td className="px-2 py-3">
                          {log.entity ? <Badge tone="neutral">{log.entity}</Badge> : '—'}
                        </td>
                        <td className="max-w-[220px] truncate px-2 py-3 text-muted-foreground">
                          {log.user?.email ?? (log.userId ? 'Unknown user' : 'System')}
                        </td>
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                          {log.ip ?? '—'}
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
                  : 'Showing 0 events'}
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

      <ActivityLogDetailsDialog
        open={viewing !== null}
        log={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}
