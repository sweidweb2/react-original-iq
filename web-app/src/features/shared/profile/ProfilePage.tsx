import { type FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { AsyncState, EmptyState, InlineSpinner } from '@/components/feedback'
import { Field, FieldError, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { type FieldErrors, parseForm } from '@/lib/form'
import { downloadExport, type ExportResource } from '@/services/exports'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageShell, SectionCard } from '../PortalPageShell'
import { profileUpdateSchema, type ProfileUpdateValues } from './profile.schema'

function displayNameFromStore(user: ReturnType<typeof useAuthStore.getState>['user']): string {
  return (
    user?.profile?.displayName?.trim() ||
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ').trim() ||
    ''
  )
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [values, setValues] = useState<ProfileUpdateValues>({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof ProfileUpdateValues>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [exporting, setExporting] = useState<ExportResource | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        await refreshProfile()
        if (cancelled) return
        const fresh = useAuthStore.getState().user
        setValues((prev) => ({
          ...prev,
          name: displayNameFromStore(fresh),
          phone: fresh?.phone ?? '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }))
      } catch (error) {
        if (!cancelled) setLoadError(error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [refreshProfile])

  async function onSave(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(profileUpdateSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSaving(true)
    try {
      const payload: Parameters<typeof updateProfile>[0] = {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      }
      if (parsed.data.newPassword) {
        payload.currentPassword = parsed.data.currentPassword
        payload.newPassword = parsed.data.newPassword
        payload.confirmPassword = parsed.data.confirmPassword
      }
      await updateProfile(payload)
      setValues((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      toast.success('Profile updated')
    } catch (error) {
      toastApiError(error, 'Could not save profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <PortalPageShell
        title="Profile"
        description="Update personal information and password."
        maxWidth="4xl"
      >
        <InlineSpinner label="Loading profile…" />
      </PortalPageShell>
    )
  }

  if (loadError) {
    return (
      <PortalPageShell
        title="Profile"
        description="Update personal information and password."
        maxWidth="4xl"
      >
        <AsyncState error={loadError} onRetry={() => window.location.reload()}>
          <span className="sr-only">Profile unavailable</span>
        </AsyncState>
      </PortalPageShell>
    )
  }

  return (
    <PortalPageShell
      title="Profile"
      description="Update personal information and password. Shared across all portals."
      actions={
        <Button
          type="submit"
          form="profile-form"
          size="sm"
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      }
      maxWidth="4xl"
    >
      <form id="profile-form" onSubmit={onSave} className="flex flex-col gap-6" noValidate>
        <SectionCard title="Personal information" description="Name and email.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
              <FieldLabel htmlFor="displayName">Display name</FieldLabel>
              <Input
                id="displayName"
                value={values.name}
                placeholder="Your name"
                aria-invalid={Boolean(fieldErrors.name) || undefined}
                onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </Field>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Email</span>
              <Input defaultValue={user?.email ?? ''} type="email" readOnly disabled />
            </label>
            <Field>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                id="phone"
                value={values.phone}
                placeholder="Optional"
                onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </Field>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Role</span>
              <Input defaultValue={user?.role ?? ''} readOnly disabled />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Password" description="Change your account password.">
          <div className="grid max-w-md gap-4">
            <Field data-invalid={Boolean(fieldErrors.currentPassword) || undefined}>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  value={values.currentPassword}
                  aria-invalid={Boolean(fieldErrors.currentPassword) || undefined}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FieldError>{fieldErrors.currentPassword}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.newPassword) || undefined}>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  placeholder="Leave blank to keep current"
                  value={values.newPassword}
                  aria-invalid={Boolean(fieldErrors.newPassword) || undefined}
                  onChange={(e) => setValues((prev) => ({ ...prev, newPassword: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FieldError>{fieldErrors.newPassword}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.confirmPassword) || undefined}>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={values.confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword) || undefined}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
              <FieldError>{fieldErrors.confirmPassword}</FieldError>
            </Field>
          </div>
        </SectionCard>
      </form>

      {user?.role === 'admin' || user?.role === 'super' ? (
        <SectionCard
          title="Exports"
          description="Download CSV snapshots for users, tasks, billing, and CRM data."
        >
          <div className="flex flex-wrap gap-2">
            {(['users', 'tasks', 'payments', 'refunds', 'leads', 'feedback'] as const).map(
              (resource) => (
                <Button
                  key={resource}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={async () => {
                    setExporting(resource)
                    try {
                      await downloadExport(resource)
                      toast.success(`Downloaded ${resource}.csv`)
                    } catch (error) {
                      toastApiError(error, 'Export failed')
                    } finally {
                      setExporting(null)
                    }
                  }}
                >
                  {exporting === resource ? 'Exporting…' : resource}
                </Button>
              ),
            )}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Danger zone"
        description="Account deletion follows role rules (client-facing later)."
      >
        <EmptyState
          title="Delete account"
          description="This action will be gated by backend rules."
          action={
            <Button type="button" variant="danger" size="sm" disabled>
              Delete account
            </Button>
          }
        />
      </SectionCard>
    </PortalPageShell>
  )
}
