import { type FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { type FieldErrors, parseForm } from '@/lib/form'
import { assignableRoles, useCan } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'
import { toastApiError, toastSuccess } from '@/services/toast'
import {
  createUser,
  type ManagedUser,
  profileName,
  updateUser,
  userDisplayName,
  type UserStatus,
} from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { createUserSchema, editUserSchema } from './users.schema'

type FormState = {
  name: string
  email: string
  phone: string
  password: string
  role: AuthRole
  status: UserStatus
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'client',
  status: 'ACTIVE',
}

type UserFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  user: ManagedUser | null
  currentUserId?: string
  onClose: () => void
  onSaved: () => void
}

export function UserFormDialog({
  open,
  mode,
  user,
  currentUserId,
  onClose,
  onSaved,
}: UserFormDialogProps) {
  const [values, setValues] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isSelf = Boolean(user && user.id === currentUserId)
  const roleOptions = assignableRoles(useAuthStore((state) => state.user))
  const can = useCan()
  const canChangeRole = mode === 'create' || (!isSelf && can('change_user_roles'))
  const canChangeStatus = !isSelf && can('activate_users')
  const canSetPassword = mode === 'create' || can('reset_user_passwords')

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setShowPassword(false)
    if (mode === 'edit' && user) {
      setValues({
        name: profileName(user),
        email: user.email,
        phone: user.phone ?? '',
        password: '',
        role: user.role,
        status: user.status,
      })
      return
    }
    setValues(emptyForm)
  }, [open, mode, user])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        const parsed = parseForm(createUserSchema, values)
        if (!parsed.success) {
          setFieldErrors(parsed.fieldErrors)
          return
        }
        setFieldErrors({})
        const { phone, ...rest } = parsed.data
        await createUser({ ...rest, ...(phone ? { phone } : {}) })
        toastSuccess('User created', `${parsed.data.name} (${parsed.data.email}) can now sign in.`)
      } else if (user) {
        const parsed = parseForm(editUserSchema, values)
        if (!parsed.success) {
          setFieldErrors(parsed.fieldErrors)
          return
        }
        setFieldErrors({})
        await updateUser(user.id, {
          ...(parsed.data.name ? { name: parsed.data.name } : {}),
          role: parsed.data.role,
          status: parsed.data.status,
          ...(parsed.data.password ? { password: parsed.data.password } : {}),
        })
        toastSuccess(
          'User saved',
          `Changes to ${parsed.data.name || userDisplayName(user)} were saved.`,
        )
      }
      onSaved()
      onClose()
    } catch (error) {
      toastApiError(
        error,
        mode === 'create'
          ? "Couldn't create the user"
          : `Couldn't save changes to ${user ? userDisplayName(user) : 'this user'}`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Add user' : 'Edit user'}
      description={
        mode === 'create'
          ? 'Create an account and choose the role they sign in with.'
          : 'Update the name, role, status, or password.'
      }
    >
      <Form id="user-form" onSubmit={onSubmit} noValidate>
        <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
          <FieldLabel htmlFor="user-name">Name</FieldLabel>
          <Input
            id="user-name"
            value={values.name}
            autoComplete="name"
            placeholder="Full name"
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>

        <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
          <FieldLabel htmlFor="user-email">Email</FieldLabel>
          <Input
            id="user-email"
            type="email"
            value={values.email}
            autoComplete="off"
            placeholder="name@example.com"
            disabled={mode === 'edit'}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
          />
          <FieldError>{fieldErrors.email}</FieldError>
        </Field>

        {mode === 'create' ? (
          <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
            <FieldLabel htmlFor="user-phone">Phone</FieldLabel>
            <Input
              id="user-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              maxLength={20}
              value={values.phone}
              placeholder="Optional"
              aria-invalid={Boolean(fieldErrors.phone) || undefined}
              onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Optional. 8 to 20 characters if you add one.
            </p>
            <FieldError>{fieldErrors.phone}</FieldError>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="user-role">Role</FieldLabel>
          <Select
            id="user-role"
            value={values.role}
            disabled={!canChangeRole}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, role: event.target.value as AuthRole }))
            }
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
          {isSelf ? (
            <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
          ) : null}
        </Field>

        {mode === 'edit' ? (
          <Field>
            <FieldLabel htmlFor="user-status">Status</FieldLabel>
            <Select
              id="user-status"
              value={values.status}
              disabled={!canChangeStatus}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, status: event.target.value as UserStatus }))
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE" disabled={isSelf}>
                Inactive
              </option>
            </Select>
            {isSelf ? (
              <p className="text-xs text-muted-foreground">
                You cannot deactivate your own account.
              </p>
            ) : null}
          </Field>
        ) : null}

        {canSetPassword ? (
          <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
            <FieldLabel htmlFor="user-password">
              {mode === 'create' ? 'Password' : 'New password'}
            </FieldLabel>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={mode === 'create' ? 'At least 8 characters' : 'Leave blank to keep'}
                className="pr-10"
                value={values.password}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError>{fieldErrors.password}</FieldError>
          </Field>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'create' ? 'Create user' : 'Save changes'}
          </Button>
        </div>
      </Form>
    </Dialog>
  )
}
