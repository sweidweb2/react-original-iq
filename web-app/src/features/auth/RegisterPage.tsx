import { type FormEvent, useState } from 'react'
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

import { registerSchema, type RegisterValues } from './register.schema'

export function RegisterPage() {
  useDocumentTitle('Register')
  const register = useAuthStore((s) => s.register)
  const [values, setValues] = useState<RegisterValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof RegisterValues>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <Form onSubmit={onSubmit} className="w-full max-w-sm gap-4" noValidate>
          <BrandLogo variant="wordmark" className="mx-auto h-16 w-auto" />
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
            <p className="text-sm text-muted-foreground">
              New accounts start with the client role.
            </p>
          </div>

          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  value={values.firstName ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  value={values.lastName ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>

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
                autoComplete="new-password"
                value={values.password}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
              />
              <FieldError>{fieldErrors.password}</FieldError>
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Register'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </Form>
      </div>
    </GuestOnly>
  )
}
