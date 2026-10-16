import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { AsyncState, EmptyState } from '@/components/feedback'
import { Field, FieldError, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { type FieldErrors, parseForm } from '@/lib/form'
import type { AuthRole } from '@/services/auth'
import { toastApiError } from '@/services/toast'
import {
  createSpecialization,
  deleteSpecialization,
  listSpecializations,
  type Specialization,
} from '@/services/specializations'
import {
  assignUserPermissions,
  getUserPermissions,
  listPermissions,
  type RbacPermission,
} from '@/services/rbac'
import {
  deactivateUser,
  deleteUser,
  getUser,
  type ManagedUser,
  updateUser,
  userDisplayName,
  type UserStatus,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'

const ROLE_OPTIONS: { value: AuthRole; label: string }[] = [
  { value: 'super', label: 'Super' },
  { value: 'admin', label: 'Admin' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'client', label: 'Client' },
]

const editSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  role: z.enum(['super', 'admin', 'coordinator', 'tutor', 'client']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  password: z
    .string()
    .max(128)
    .refine((v) => v.length === 0 || v.length >= 8, 'Password must be at least 8 characters'),
})

type FormState = {
  name: string
  role: AuthRole
  status: UserStatus
  password: string
}

export function ManageUserProfilePage() {
  const { userId = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const actor = useAuthStore((s) => s.user)
  const isAdmin = actor?.role === 'admin' || actor?.role === 'super'
  const canDelete = isAdmin || actor?.role === 'coordinator'
  const portalBase = pathname.replace(/\/users\/[^/]+\/?$/, '')
  const backTo = portalBase.endsWith('/admin') ? `${portalBase}/users` : portalBase
  const backLabel = portalBase.endsWith('/admin') ? 'Back to users' : 'Back to home'

  const [user, setUser] = useState<ManagedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [values, setValues] = useState<FormState>({
    name: '',
    role: 'client',
    status: 'ACTIVE',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [specs, setSpecs] = useState<Specialization[]>([])
  const [specName, setSpecName] = useState('')
  const [specBusy, setSpecBusy] = useState(false)
  const [allPermissions, setAllPermissions] = useState<RbacPermission[]>([])
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [permsBusy, setPermsBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function loadSpecs(tutorId: string) {
    try {
      const result = await listSpecializations(tutorId)
      setSpecs(result.data)
    } catch {
      setSpecs([])
    }
  }

  async function load() {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getUser(userId)
      setUser(data)
      setValues({
        name: userDisplayName(data),
        role: data.role,
        status: data.status,
        password: '',
      })
      if (data.role === 'tutor') {
        await loadSpecs(data.id)
      } else {
        setSpecs([])
      }
      if (isAdmin) {
        const [catalog, assigned] = await Promise.all([
          listPermissions().catch(() => ({ data: [] as RbacPermission[] })),
          getUserPermissions(data.id).catch(() => ({ permissionIds: [] as string[] })),
        ])
        setAllPermissions(catalog.data ?? [])
        setSelectedPermissionIds(assigned.permissionIds ?? [])
      }
    } catch (err) {
      setError(err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when userId changes
  }, [userId])

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    const parsed = parseForm(editSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }
    setFieldErrors({})
    setSaving(true)
    try {
      const payload: Parameters<typeof updateUser>[1] = { name: parsed.data.name }
      if (isAdmin) {
        if (parsed.data.role !== user.role) payload.role = parsed.data.role
        if (parsed.data.status !== user.status) payload.status = parsed.data.status
        if (parsed.data.password) payload.password = parsed.data.password
      }
      const updated = await updateUser(user.id, payload)
      setUser(updated)
      setValues((prev) => ({
        ...prev,
        name: userDisplayName(updated),
        role: updated.role,
        status: updated.status,
        password: '',
      }))
      toast.success('User updated')
    } catch (err) {
      toastApiError(err, 'Could not update user')
    } finally {
      setSaving(false)
    }
  }

  async function onDeactivate() {
    if (!user || !isAdmin) return
    setDeactivating(true)
    try {
      const updated = await deactivateUser(user.id)
      setUser(updated)
      setValues((prev) => ({ ...prev, status: updated.status }))
      toast.success('User deactivated')
    } catch (err) {
      toastApiError(err, 'Could not deactivate user')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <PortalPageShell
      title="Manage user"
      description={user ? `Profile for ${userDisplayName(user)}` : 'Profile management'}
      actions={
        <>
          {isAdmin && user && user.status === 'ACTIVE' && user.id !== actor?.id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deactivating}
              onClick={() => void onDeactivate()}
            >
              {deactivating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Deactivate
            </Button>
          ) : null}
          <Button
            type="submit"
            form="manage-user-form"
            size="sm"
            disabled={saving || isLoading || !user}
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save
          </Button>
        </>
      }
      maxWidth="4xl"
    >
      <p className="text-sm text-muted-foreground">
        <Link to={backTo} className="font-medium text-primary hover:underline">
          {backLabel}
        </Link>
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={() => void load()}>
        {user ? (
          <>
            <SectionCard title="User details" description="Update profile fields for this account.">
              <form id="manage-user-form" onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
                  <FieldLabel htmlFor="user-name">Name</FieldLabel>
                  <Input
                    id="user-name"
                    value={values.name}
                    onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
                    aria-invalid={Boolean(fieldErrors.name) || undefined}
                  />
                  <FieldError>{fieldErrors.name}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-email">Email</FieldLabel>
                  <Input id="user-email" value={user.email} disabled />
                </Field>
                <Field data-invalid={Boolean(fieldErrors.role) || undefined}>
                  <FieldLabel htmlFor="user-role">Role</FieldLabel>
                  <Select
                    id="user-role"
                    value={values.role}
                    disabled={!isAdmin || user.id === actor?.id}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, role: e.target.value as AuthRole }))
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <FieldError>{fieldErrors.role}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldErrors.status) || undefined}>
                  <FieldLabel htmlFor="user-status">Status</FieldLabel>
                  <Select
                    id="user-status"
                    value={values.status}
                    disabled={!isAdmin || user.id === actor?.id}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, status: e.target.value as UserStatus }))
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                  <FieldError>{fieldErrors.status}</FieldError>
                </Field>
                {isAdmin ? (
                  <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
                    <FieldLabel htmlFor="user-password">New password (optional)</FieldLabel>
                    <Input
                      id="user-password"
                      type="password"
                      autoComplete="new-password"
                      value={values.password}
                      placeholder="Leave blank to keep current"
                      onChange={(e) => setValues((p) => ({ ...p, password: e.target.value }))}
                      aria-invalid={Boolean(fieldErrors.password) || undefined}
                    />
                    <FieldError>{fieldErrors.password}</FieldError>
                  </Field>
                ) : null}
              </form>
            </SectionCard>

            {user.role === 'tutor' ? (
              <SectionCard
                title="Specializations"
                description="Subjects or skills for this tutor."
              >
                <form
                  className="mb-4 flex flex-wrap gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!specName.trim()) return
                    setSpecBusy(true)
                    void createSpecialization({ tutorId: user.id, name: specName.trim() })
                      .then(() => {
                        toast.success('Specialization added')
                        setSpecName('')
                        return loadSpecs(user.id)
                      })
                      .catch((err) => toastApiError(err, 'Could not add specialization'))
                      .finally(() => setSpecBusy(false))
                  }}
                >
                  <Input
                    className="max-w-xs"
                    placeholder="e.g. Calculus"
                    value={specName}
                    onChange={(e) => setSpecName(e.target.value)}
                  />
                  <Button type="submit" size="sm" disabled={specBusy || !specName.trim()}>
                    Add
                  </Button>
                </form>
                {specs.length === 0 ? (
                  <EmptyState title="No specializations" description="Add subjects this tutor covers." />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {specs.map((spec) => (
                      <li
                        key={spec.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                      >
                        <span className="font-medium">{spec.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={specBusy}
                          onClick={() => {
                            setSpecBusy(true)
                            void deleteSpecialization(spec.id)
                              .then(() => {
                                toast.success('Removed')
                                return loadSpecs(user.id)
                              })
                              .catch((err) => toastApiError(err, 'Could not remove'))
                              .finally(() => setSpecBusy(false))
                          }}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            ) : null}

            <SectionCard title="Related tasks" description="Tasks linked to this user.">
              <EmptyState
                title="Browse tasks"
                description="Open the tasks list to find work linked to this user."
                action={
                  <Link
                    to={`${portalBase}/tasks`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open tasks
                  </Link>
                }
              />
            </SectionCard>

            {isAdmin ? (
              <SectionCard
                title="Permissions"
                description="Fine-grained permissions for this user (admin only)."
              >
                {allPermissions.length === 0 ? (
                  <EmptyState title="No permissions catalog" description="Create permissions in RBAC first." />
                ) : (
                  <>
                    <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto text-sm">
                      {allPermissions.map((permission) => {
                        const checked = selectedPermissionIds.includes(permission.id)
                        return (
                          <li key={permission.id}>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedPermissionIds((prev) =>
                                    e.target.checked
                                      ? [...prev, permission.id]
                                      : prev.filter((id) => id !== permission.id),
                                  )
                                }}
                              />
                              <span>{permission.key}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                    <Button
                      type="button"
                      size="sm"
                      disabled={permsBusy}
                      onClick={() => {
                        if (!user) return
                        setPermsBusy(true)
                        void assignUserPermissions(user.id, selectedPermissionIds)
                          .then(() => toast.success('Permissions saved'))
                          .catch((err) => toastApiError(err, 'Could not save permissions'))
                          .finally(() => setPermsBusy(false))
                      }}
                    >
                      Save permissions
                    </Button>
                  </>
                )}
              </SectionCard>
            ) : null}

            <SectionCard title="Danger zone" description="Safe delete when the user has no active tasks or money rows.">
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={!canDelete || deleting || user.id === actor?.id}
                onClick={() => {
                  if (!window.confirm(`Permanently delete ${userDisplayName(user)}?`)) return
                  setDeleting(true)
                  void deleteUser(user.id)
                    .then(() => {
                      toast.success('User deleted')
                      navigate(backTo)
                    })
                    .catch((err) => toastApiError(err, 'Could not delete user'))
                    .finally(() => setDeleting(false))
                }}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Delete user
              </Button>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="User not found" description="This account may have been removed." />
        )}
      </AsyncState>
    </PortalPageShell>
  )
}
