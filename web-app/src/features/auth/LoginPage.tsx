import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldGroup, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
          <div className="space-y-1">
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
              />
              <FieldError>{fieldErrors.password}</FieldError>
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
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
