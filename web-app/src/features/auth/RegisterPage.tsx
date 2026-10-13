import { type FormEvent, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { AuthCard } from './AuthCard'
import { registerSchema, type RegisterValues } from './register.schema'

const fieldClass = '!h-11 !rounded-lg !bg-white !shadow-none'

export function RegisterPage() {
  useDocumentTitle('Sign up')
  const register = useAuthStore((s) => s.register)
  const [values, setValues] = useState<RegisterValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof RegisterValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(registerSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const { firstName, lastName, email, password } = parsed.data
      await register({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })
      toast.success('Account created')
    } catch (error) {
      toastApiError(error, 'Could not register')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(52,184,193,0.16),transparent_55%)] px-4 py-12">
        <AuthCard badge="CREATE ACCOUNT" subtitle="Create your account">
          <Form onSubmit={onSubmit} className="gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  placeholder="First name"
                  className={fieldClass}
                  value={values.firstName ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  placeholder="Last name"
                  className={fieldClass}
                  value={values.lastName ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </Field>
            </div>

            <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
              <FieldLabel htmlFor="signup-email">Email Address</FieldLabel>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={values.email}
                aria-invalid={Boolean(fieldErrors.email) || undefined}
                className={fieldClass}
                onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  className={`${fieldClass} !pr-10`}
                  value={values.password}
                  aria-invalid={Boolean(fieldErrors.password) || undefined}
                  onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls="signup-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FieldError>{fieldErrors.password}</FieldError>
            </Field>

            <Button
              type="submit"
              className="!h-12 !w-full !rounded-xl !bg-primary !bg-none !shadow-[0_10px_24px_rgba(52,184,193,0.35)] hover:!translate-y-0"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isSubmitting ? 'Creating…' : 'Sign up'}
            </Button>

            <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
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
