import { type FormEvent, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { forgotPassword } from '@/services/auth'
import { toastApiError } from '@/services/toast'

import { AuthCard } from './AuthCard'
import { forgotPasswordSchema, type ForgotPasswordValues } from './password-reset.schema'

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  const navigate = useNavigate()
  const [values, setValues] = useState<ForgotPasswordValues>({ email: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof ForgotPasswordValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(forgotPasswordSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const result = await forgotPassword(parsed.data.email)
      toast.success(result.message)
      void navigate('/password-reset/verify', {
        state: { email: parsed.data.email },
      })
    } catch (error) {
      toastApiError(error, 'Could not start password reset')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_55%)] px-4 py-12">
        <AuthCard badge="RESET ACCESS" subtitle="Forgot your password?">
          <Form onSubmit={onSubmit} className="gap-4" noValidate>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send a 6-digit verification code if an account exists.
            </p>

            <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={values.email}
                aria-invalid={Boolean(fieldErrors.email) || undefined}
                onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isSubmitting ? 'Sending code…' : 'Send reset code'}
            </Button>

            <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </Form>
        </AuthCard>
      </div>
    </GuestOnly>
  )
}
