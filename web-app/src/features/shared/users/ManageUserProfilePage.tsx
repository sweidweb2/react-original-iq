import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
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
  deactivateUser,
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
  const actor = useAuthStore((s) => s.user)
  const isAdmin = actor?.role === 'admin' || actor?.role === 'super'
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

            <SectionCard title="Related tasks" description="Tasks linked to this user.">
              <EmptyState
                title="No related tasks"
                description="Task links will appear here once tasks are available."
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

            <SectionCard title="Danger zone" description="Destructive actions are admin-gated.">
              <Button type="button" variant="danger" size="sm" disabled>
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
