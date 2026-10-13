import { type FormEvent, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GuestOnly } from '@/components/auth'
import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { toastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

import { AuthCard } from './AuthCard'
import { loginSchema, type LoginValues } from './login.schema'

const fieldClass = '!h-11 !rounded-lg !bg-white !shadow-none'

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
  const [remember, setRemember] = useState(false)

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
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(52,184,193,0.16),transparent_55%)] px-4 py-12">
        <AuthCard badge="UNIFIED ACCESS" subtitle="Universal Access Portal">
          <Form onSubmit={onSubmit} className="gap-4" noValidate>
            <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
              <FieldLabel htmlFor="email">Email Address</FieldLabel>
              <Input
                id="email"
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
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between gap-3">
              <Checkbox
                label="Remember Me"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <a
                href="mailto:info@original-iq.com"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot Your Password?
              </a>
            </div>

            <Button
              type="submit"
              className="!h-12 !w-full !rounded-xl !bg-primary !bg-none !shadow-[0_10px_24px_rgba(52,184,193,0.35)] hover:!translate-y-0"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </Form>
        </AuthCard>
      </div>
    </GuestOnly>
  )
}
