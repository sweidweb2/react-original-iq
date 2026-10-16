import { type FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { resetPassword } from '@/services/auth'
import { toastApiError } from '@/services/toast'

import { AuthCard } from './AuthCard'
import { resetPasswordSchema, type ResetPasswordValues } from './password-reset.schema'

type LocationState = { email?: string; code?: string }

export function ResetUpdatePage() {
  useDocumentTitle('Set new password')
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState | null) ?? {}

  const [values, setValues] = useState<ResetPasswordValues>({
    email: state.email ?? '',
    code: state.code ?? '',
    newPassword: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof ResetPasswordValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (!state.email || !state.code) {
      void navigate('/password-reset/verify', { replace: true })
    }
  }, [navigate, state.code, state.email])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(resetPasswordSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const result = await resetPassword(parsed.data)
      toast.success(result.message)
      void navigate('/login', { replace: true })
    } catch (error) {
      toastApiError(error, 'Could not update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_55%)] px-4 py-12">
        <AuthCard badge="NEW PASSWORD" subtitle="Choose a new password">
          <Form onSubmit={onSubmit} className="gap-4" noValidate>
            <Field data-invalid={Boolean(fieldErrors.newPassword) || undefined}>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
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
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  value={values.confirmPassword}
                  aria-invalid={Boolean(fieldErrors.confirmPassword) || undefined}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FieldError>{fieldErrors.confirmPassword}</FieldError>
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isSubmitting ? 'Updating…' : 'Update password'}
            </Button>

            <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </Form>
        </AuthCard>
      </div>
    </GuestOnly>
  )
}
