import { type FormEvent, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { resendResetCode, verifyResetCode } from '@/services/auth'
import { toastApiError } from '@/services/toast'

import { AuthCard } from './AuthCard'
import { verifyResetCodeSchema, type VerifyResetCodeValues } from './password-reset.schema'

type LocationState = { email?: string }

export function ResetVerifyPage() {
  useDocumentTitle('Verify reset code')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get('email') ?? ''
  const emailFromState = (location.state as LocationState | null)?.email ?? ''

  const [values, setValues] = useState<VerifyResetCodeValues>({
    email: emailFromState || emailFromQuery,
    code: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof VerifyResetCodeValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const nextEmail = emailFromState || emailFromQuery
    if (nextEmail) {
      setValues((prev) => (prev.email ? prev : { ...prev, email: nextEmail }))
    }
  }, [emailFromQuery, emailFromState])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(verifyResetCodeSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await verifyResetCode(parsed.data.email, parsed.data.code)
      toast.success('Code verified')
      void navigate('/password-reset/update', {
        state: { email: parsed.data.email, code: parsed.data.code },
      })
    } catch (error) {
      toastApiError(error, 'Invalid or expired code')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onResend() {
    const email = values.email.trim()
    if (!email) {
      setFieldErrors((prev) => ({ ...prev, email: 'Email is required' }))
      return
    }

    setIsResending(true)
    try {
      const result = await resendResetCode(email.toLowerCase())
      toast.success(result.message)
    } catch (error) {
      toastApiError(error, 'Could not resend code')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <GuestOnly>
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_55%)] px-4 py-12">
        <AuthCard badge="VERIFY CODE" subtitle="Enter your reset code">
          <Form onSubmit={onSubmit} className="gap-4" noValidate>
            <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={values.email}
                aria-invalid={Boolean(fieldErrors.email) || undefined}
                onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.code) || undefined}>
              <FieldLabel htmlFor="code">6-digit code</FieldLabel>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={values.code}
                aria-invalid={Boolean(fieldErrors.code) || undefined}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    code: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
              />
              <FieldError>{fieldErrors.code}</FieldError>
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isSubmitting ? 'Verifying…' : 'Verify code'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={isResending}
              aria-busy={isResending}
              onClick={() => void onResend()}
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </Button>

            <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
                Use a different email
              </Link>
            </p>
          </Form>
        </AuthCard>
      </div>
    </GuestOnly>
  )
}
