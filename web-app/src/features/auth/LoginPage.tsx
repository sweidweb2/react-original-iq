import { type FormEvent, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Field, FieldError, FieldGroup, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { loginSchema, type LoginValues } from './login.schema'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const login = useAuthStore((s) => s.login)
  const [values, setValues] = useState<LoginValues>({
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LoginValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(loginSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await login(parsed.data.email, parsed.data.password)
      toast.success('Signed in')
    } catch (error) {
      toastApiError(error, 'Could not sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <Form onSubmit={onSubmit} className="w-full max-w-sm gap-4" noValidate>
          <BrandLogo variant="wordmark" className="mx-auto h-16 w-auto" />
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use your Original IQ account.</p>
          </div>

          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
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

            <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  value={values.password}
                  aria-invalid={Boolean(fieldErrors.password) || undefined}
                  onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls="password"
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
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </Form>
      </div>
    </GuestOnly>
  )
}
