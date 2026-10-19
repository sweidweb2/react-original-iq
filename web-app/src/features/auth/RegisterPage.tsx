import { type FormEvent, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { toastApiError, toastSuccess } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'
import { useMaintenanceStore } from '@/stores/maintenanceStore'

import { AuthCard } from './AuthCard'
import { MaintenanceBanner } from './MaintenanceBanner'
import { registerSchema, type RegisterValues } from './register.schema'

export function RegisterPage() {
  useDocumentTitle('Sign up')
  const register = useAuthStore((s) => s.register)
  const maintenanceMode = useMaintenanceStore((s) => s.maintenanceMode)
  const [values, setValues] = useState<RegisterValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
      const { firstName, lastName, email, phone, password } = parsed.data
      await register({
        email,
        password,
        phone,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })
      toastSuccess('Account created', `You're signed in as ${email}.`)
    } catch (error) {
      toastApiError(error, "Couldn't create your account")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_55%)] px-4 py-12">
        <AuthCard badge="CREATE ACCOUNT" subtitle="Create your account">
          <Form onSubmit={onSubmit} className="gap-4" noValidate>
            <MaintenanceBanner page="signup" />

            <fieldset disabled={maintenanceMode} className="contents">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    placeholder="First name"
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
                  onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
                <FieldLabel htmlFor="signup-phone">Phone number</FieldLabel>
                <Input
                  id="signup-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="+961 70 123 456"
                  maxLength={20}
                  value={values.phone}
                  aria-invalid={Boolean(fieldErrors.phone) || undefined}
                  onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <FieldError>{fieldErrors.phone}</FieldError>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
                <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    className="pr-10"
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
                size="lg"
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {isSubmitting ? 'Creating…' : 'Sign up'}
              </Button>
            </fieldset>

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
