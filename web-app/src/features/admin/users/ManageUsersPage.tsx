import { useEffect, useState } from 'react'
import { Pencil, UserPlus, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldLabel } from '@/components/forms'
import { PageHeader } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { IconAction } from '@/components/ui/icon-action'
import { SearchField } from '@/components/ui/search-field'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { canManageRole, ROLE_OPTIONS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { AuthRole } from '@/services/auth'
import { toastApiError, toastSuccess } from '@/services/toast'
import {
  deactivateUser,
  getUserStats,
  listUsers,
  type ManagedUser,
  updateUser,
  userDisplayName,
  type UserListMeta,
  type UserStats,
  type UserStatus,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { UserFormDialog } from './UserFormDialog'

const PAGE_SIZE = 10

const ROLE_FILTER_OPTIONS: { value: '' | AuthRole; label: string }[] = [
  { value: '', label: 'All roles' },
  ...ROLE_OPTIONS,
]

const ROLE_LABEL = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<AuthRole, string>

type Directory = {
  users: ManagedUser[]
  meta: UserListMeta
  stats: UserStats
}

function AccessSwitch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition',
        checked ? 'bg-primary' : 'bg-border',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function ManageUsersPage() {
  useDocumentTitle('Users')
  const currentUserId = useAuthStore((state) => state.user?.id)
  const actorRole = useAuthStore((state) => state.user?.role)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'' | AuthRole>('')
  const [status, setStatus] = useState<'' | UserStatus>('')
  const [reloadKey, setReloadKey] = useState(0)

  const [directory, setDirectory] = useState<Directory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [pending, setPending] = useState<ManagedUser | null>(null)
  const [isActing, setIsActing] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search, role, status])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      listUsers({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
      getUserStats(),
    ])
      .then(([list, stats]) => {
        if (cancelled) return
        const totalPages = Math.max(1, Math.ceil(list.meta.total / list.meta.limit))
        if (page > totalPages) {
          setPage(totalPages)
          return
        }
        setDirectory({ users: list.data, meta: list.meta, stats })
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
  }, [page, search, role, status, reloadKey])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  async function confirmStatusChange() {
    if (!pending) return
    setIsActing(true)
    try {
      if (pending.status === 'ACTIVE') {
        await deactivateUser(pending.id)
        toastSuccess('User deactivated', `${userDisplayName(pending)} can no longer sign in.`)
      } else {
        await updateUser(pending.id, { status: 'ACTIVE' })
        toastSuccess('User activated', `${userDisplayName(pending)} can sign in again.`)
      }
      setPending(null)
      refresh()
    } catch (actionError) {
      toastApiError(
        actionError,
        pending.status === 'ACTIVE'
          ? `Couldn't deactivate ${userDisplayName(pending)}`
          : `Couldn't activate ${userDisplayName(pending)}`,
      )
    } finally {
      setIsActing(false)
    }
  }

  const stats = directory?.stats
  const meta = directory?.meta
  const users = directory?.users ?? []
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / PAGE_SIZE))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  const statCards = [
    {
      key: 'total',
      label: 'Total users',
      value: stats?.total ?? 0,
      pressed: role === '' && status === '',
      onSelect: () => {
        setRole('')
        setStatus('')
      },
    },
    {
      key: 'active',
      label: 'Active',
      value: stats?.active ?? 0,
      pressed: role === '' && status === 'ACTIVE',
      onSelect: () => {
        setRole('')
        setStatus('ACTIVE')
      },
    },
    {
      key: 'inactive',
      label: 'Inactive',
      value: stats?.inactive ?? 0,
      pressed: role === '' && status === 'INACTIVE',
      onSelect: () => {
        setRole('')
        setStatus('INACTIVE')
      },
    },
    {
      key: 'clients',
      label: 'Clients',
      value: stats?.byRole.client ?? 0,
      pressed: role === 'client' && status === '',
      onSelect: () => {
        setRole('client')
        setStatus('')
      },
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Users"
        description="Create accounts, update roles, and turn access on or off."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormMode('create')
            }}
          >
            <UserPlus className="size-4" />
            Add user
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <Field className="sm:col-span-2 lg:col-span-1">
              <FieldLabel htmlFor="users-search">Search</FieldLabel>
              <SearchField
                id="users-search"
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="Name or email"
                label="Search users"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="users-role">Role</FieldLabel>
              <Select
                id="users-role"
                value={role}
                onChange={(event) => setRole(event.target.value as '' | AuthRole)}
              >
                {ROLE_FILTER_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="users-status">Status</FieldLabel>
              <Select
                id="users-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as '' | UserStatus)}
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>
          </div>

          <AsyncState
            isLoading={isLoading && !directory}
            error={error}
            onRetry={refresh}
            loadingFallback={
              <div className="flex flex-col gap-2" role="status" aria-label="Loading users">
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
              </div>
            }
          >
            {users.length === 0 ? (
              <EmptyState
                icon={<Users className="size-6" aria-hidden />}
                title="No users found"
                description={
                  search || role || status
                    ? 'Try a different search or clear the filters.'
                    : 'Add the first account to get started.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <caption className="sr-only">Users</caption>
                  <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Email</th>
                      <th className="px-2 py-2 font-medium">Role</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Created</th>
                      <th className="px-2 py-2 text-center font-medium">Active</th>
                      <th className="px-2 py-2 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const name = userDisplayName(user)
                      const isSelf = user.id === currentUserId
                      const canManage = canManageRole(actorRole, user.role)
                      return (
                        <tr key={user.id} className="border-b border-border last:border-0">
                          <td className="px-2 py-3 font-medium">
                            {name}
                            {isSelf ? (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                You
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-3 text-muted-foreground">{user.email}</td>
                          <td className="px-2 py-3">
                            <Badge tone="neutral">{ROLE_LABEL[user.role]}</Badge>
                          </td>
                          <td className="px-2 py-3">
                            <Badge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                              {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-2 py-3 text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-center">
                              <AccessSwitch
                                checked={user.status === 'ACTIVE'}
                                disabled={isSelf || !canManage || isActing}
                                label={
                                  isSelf
                                    ? 'Your account stays active'
                                    : !canManage
                                      ? 'Only a super user can change super accounts'
                                      : user.status === 'ACTIVE'
                                        ? `Deactivate ${name}`
                                        : `Activate ${name}`
                                }
                                onToggle={() => {
                                  if (!isSelf && canManage) setPending(user)
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-center gap-1">
                              <Tooltip content={`Open profile for ${name}`}>
                                <Link
                                  to={user.id}
                                  aria-label={`Open profile for ${name}`}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted"
                                >
                                  <UserRound className="size-4" />
                                </Link>
                              </Tooltip>
                              <IconAction
                                label={
                                  canManage
                                    ? `Edit ${name}`
                                    : 'Only a super user can edit super accounts'
                                }
                                disabled={!canManage}
                                onClick={() => {
                                  setEditing(user)
                                  setFormMode('edit')
                                }}
                              >
                                <Pencil className="size-4" />
                              </IconAction>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {meta && meta.total > 0
                  ? `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`
                  : 'Showing 0 users'}
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

      <UserFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        user={editing}
        currentUserId={currentUserId}
        onClose={() => setFormMode(null)}
        onSaved={refresh}
      />

      <Dialog
        open={pending !== null}
        onClose={() => {
          if (!isActing) setPending(null)
        }}
        title={pending?.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
        description={
          pending
            ? pending.status === 'ACTIVE'
              ? `${userDisplayName(pending)} will not be able to sign in until you activate the account again.`
              : `${userDisplayName(pending)} will be able to sign in again.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={isActing}>
              Cancel
            </Button>
            <Button
              variant={pending?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={() => void confirmStatusChange()}
              disabled={isActing}
            >
              {pending?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      />
    </div>
  )
}
