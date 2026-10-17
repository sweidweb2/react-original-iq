import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { Mail, MapPin, Phone, Send } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { LocalizedLink } from '@/i18n'
import { type FieldErrors, parseForm } from '@/lib/form'
import { cn } from '@/lib/utils'
import { sendContactMessage, subscribeNewsletter } from '@/services/contact'

import { usePublicDictionary } from '../i18n'
import { publicContainerClass } from '../publicContainer'
import { SocialLinks } from '../SocialLinks'
import { type ContactMessageValues, createContactSchemas } from './contact.schema'

const emptyMessage: ContactMessageValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

function useContactText() {
  return usePublicDictionary().contact
}

function useContactSchemas() {
  const t = useContactText()
  return useMemo(() => createContactSchemas(t.validation), [t.validation])
}

export function ContactPage() {
  const t = useContactText()
  useDocumentTitle(t.documentTitle)

  return (
    <div>
      <InfoCards />
      <ContactSection />
      <Newsletter />
      <LocationMap />
    </div>
  )
}

function InfoCards() {
  const t = useContactText()

  return (
    <section className="bg-card py-8 max-md:py-6">
      <div className={publicContainerClass}>
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 max-lg:max-w-md max-lg:grid-cols-1">
          <InfoCard title={t.visitUs} icon={MapPin}>
            {t.addressLine1}
            <br /> {t.addressLine2}
          </InfoCard>
          <InfoCard title={t.emailUs} icon={Mail}>
            <a
              href="mailto:info@original-iq.com"
              dir="ltr"
              className="text-primary hover:underline"
            >
              info@original-iq.com
            </a>
          </InfoCard>
          <InfoCard title={t.callUs} icon={Phone}>
            <a href="tel:+96170858167" dir="ltr" className="text-primary hover:underline">
              +(961) 70 858 167
            </a>
            <br />
            {t.hours}
            <br />
            {t.whatsappSupport}
          </InfoCard>
        </div>
      </div>
    </section>
  )
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof MapPin
  children: ReactNode
}) {
  return (
    <Card className="border-border bg-background p-4 text-center transition duration-300 hover:-translate-y-0.5 hover:border-primary-light hover:shadow-md">
      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-white">
        <Icon className="size-4" aria-hidden />
      </div>
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <p className="text-xs leading-snug text-muted-foreground">{children}</p>
    </Card>
  )
}

function ContactSection() {
  const t = useContactText()

  return (
    <section id="support" className="bg-background py-20 max-md:py-16 max-sm:py-12">
      <div className={publicContainerClass}>
        <div className="grid grid-cols-[1.5fr_1fr] gap-12 max-lg:grid-cols-1 max-md:gap-8 max-sm:gap-6">
          <MessageForm />
          <aside className="flex flex-col gap-6 max-sm:gap-5">
            <SidebarCard title={t.quickResponse}>{t.quickResponseBody}</SidebarCard>
            <SidebarCard title={t.support247}>{t.support247Body}</SidebarCard>
            <Card className="border-border p-8 shadow-sm max-sm:p-6">
              <h2 className="mb-3 text-xl font-semibold">{t.followUs}</h2>
              <SocialLinks
                className="mt-2 justify-center"
                linkClassName="text-foreground hover:text-primary"
              />
            </Card>
            <Card className="border-0 bg-gradient-to-br from-primary-light to-primary p-8 text-white max-sm:p-6">
              <h2 className="mb-3 text-xl font-semibold text-white">{t.needHelp}</h2>
              <p className="mb-5 leading-[1.7] text-white/95">{t.needHelpBody}</p>
              <LocalizedLink
                to="/faq"
                className={cn(buttonVariants({ variant: 'inverse', size: 'sm' }), 'w-full')}
              >
                {t.visitFaq}
              </LocalizedLink>
            </Card>
          </aside>
        </div>
      </div>
    </section>
  )
}

function SidebarCard({ title, children }: { title: string; children: string }) {
  return (
    <Card className="p-8 max-md:p-7 max-sm:p-6">
      <h2 className="mb-3 text-xl font-semibold max-sm:text-lg">{title}</h2>
      <p className="leading-[1.7] text-muted-foreground max-sm:text-[0.9rem]">{children}</p>
    </Card>
  )
}

function MessageForm() {
  const t = useContactText()
  const { contactMessageSchema } = useContactSchemas()
  const [values, setValues] = useState<ContactMessageValues>(emptyMessage)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof ContactMessageValues>>({})
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(contactMessageSchema, values)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      setStatus('idle')
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    setStatus('idle')
    setErrorMessage(null)
    try {
      await sendContactMessage(parsed.data)
      setValues(emptyMessage)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : t.sendFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-12 max-md:p-8 max-sm:p-6">
      <h1 className="text-[2rem] leading-snug font-semibold max-md:text-[1.75rem] max-sm:text-2xl">
        {t.formTitle}
      </h1>
      <p className="mt-3 mb-8 leading-[1.7] text-muted-foreground max-md:text-[0.95rem] max-sm:mb-6 max-sm:text-sm">
        {t.formIntro}
      </p>
      <Form onSubmit={onSubmit} className="gap-6" noValidate>
        <Field>
          <FieldLabel htmlFor="name">{t.nameLabel}</FieldLabel>
          <Input
            id="name"
            name="name"
            maxLength={20}
            placeholder={t.namePlaceholder}
            autoComplete="name"
            value={values.name}
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t.emailLabel}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            className="rtl:text-end"
            maxLength={100}
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            value={values.email}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
          />
          <FieldError>{fieldErrors.email}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="subject">{t.subjectLabel}</FieldLabel>
          <Input
            id="subject"
            name="subject"
            maxLength={120}
            placeholder={t.subjectPlaceholder}
            value={values.subject}
            aria-invalid={Boolean(fieldErrors.subject) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, subject: event.target.value }))}
          />
          <FieldError>{fieldErrors.subject}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="message">{t.messageLabel}</FieldLabel>
          <Textarea
            id="message"
            name="message"
            rows={6}
            maxLength={245}
            placeholder={t.messagePlaceholder}
            value={values.message}
            aria-invalid={Boolean(fieldErrors.message) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, message: event.target.value }))}
          />
          <FieldError>{fieldErrors.message}</FieldError>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          <Send className="size-5 rtl:-scale-x-100" aria-hidden />
          {isSubmitting ? t.sending : t.send}
        </Button>
      </Form>
      {status === 'success' ? <Alert tone="success" className="mt-4" title={t.sent} /> : null}
      {status === 'error' ? (
        <Alert tone="danger" className="mt-4" title={errorMessage ?? t.sendFailed} />
      ) : null}
    </Card>
  )
}

function Newsletter() {
  const t = useContactText()
  const { newsletterSchema } = useContactSchemas()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseForm(newsletterSchema, { email })
    if (!parsed.success) {
      setError(parsed.fieldErrors.email)
      setStatus('idle')
      return
    }

    setError(undefined)
    setIsSubmitting(true)
    setStatus('idle')
    setErrorMessage(null)
    try {
      await subscribeNewsletter(parsed.data.email)
      setEmail('')
      setStatus('success')
    } catch (failure) {
      setStatus('error')
      setErrorMessage(failure instanceof Error ? failure.message : t.subscribeFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-16 max-md:py-14 max-sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.05)_20px,rgba(255,255,255,0.05)_40px)]" />
      <div className={cn(publicContainerClass, 'relative')}>
        <div className="flex items-center justify-between gap-12 max-lg:flex-col max-lg:gap-8 max-lg:text-center max-sm:gap-6">
          <div className="max-w-[500px] flex-1 max-lg:max-w-none">
            <h2 className="text-[2.5rem] leading-[1.2] font-semibold text-white max-md:text-[2rem] max-sm:mb-3 max-sm:text-[1.75rem]">
              {t.newsletterTitle}
            </h2>
            <p className="mt-4 text-[1.1rem] leading-relaxed text-white/90 max-md:text-base max-sm:text-[0.95rem]">
              {t.newsletterBody}
            </p>
          </div>
          <Form onSubmit={onSubmit} className="w-full max-w-[500px] flex-1 gap-0" noValidate>
            <div className="flex gap-3 max-md:flex-col max-md:gap-4">
              <div className="min-w-0 flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  {t.newsletterEmailLabel}
                </label>
                <Input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  dir="ltr"
                  required
                  placeholder={t.newsletterPlaceholder}
                  autoComplete="email"
                  value={email}
                  aria-invalid={Boolean(error) || undefined}
                  className="h-14 border-2 border-white/20 bg-white/95 px-5 text-base rtl:text-end"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="inverse"
                size="lg"
                disabled={isSubmitting}
                className="h-14 shrink-0 px-8 max-md:w-full"
              >
                <Send className="size-5 rtl:-scale-x-100" aria-hidden />
                {isSubmitting ? t.subscribing : t.subscribe}
              </Button>
            </div>
            <FieldError>{error}</FieldError>
            {status === 'success' ? (
              <Alert tone="success" className="mt-4" title={t.subscribed} />
            ) : null}
            {status === 'error' ? (
              <Alert tone="danger" className="mt-4" title={errorMessage ?? t.subscribeFailed} />
            ) : null}
          </Form>
        </div>
      </div>
    </section>
  )
}

function LocationMap() {
  const t = useContactText()

  return (
    <section className="relative h-[400px] overflow-hidden max-md:h-[300px] max-sm:h-[250px]">
      <iframe
        title={t.mapTitle}
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3312.033378126204!2d35.5588469!3d33.8887942!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151f1623b8f3ed5f%3A0x24f9905a080fc6b!2sNBC%20Computers!5e0!3m2!1sen!2slb!4v1763436178288!5m2!1sen!2slb"
        className="h-full w-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute top-5 end-5 z-[2] max-w-[300px] max-md:inset-x-2.5 max-md:top-2.5 max-md:max-w-none max-sm:inset-x-2 max-sm:top-2">
        <div className="rounded-lg border border-white/20 bg-white/95 p-6 text-center shadow-lg backdrop-blur-md max-md:p-4 max-sm:p-3.5">
          <MapPin
            className="mx-auto mb-4 size-12 text-primary max-sm:mb-2 max-sm:size-9"
            aria-hidden
          />
          <h2 className="mb-2 text-xl font-semibold max-md:text-[1.1rem] max-sm:mb-1 max-sm:text-base">
            {t.locationTitle}
          </h2>
          <p className="mb-4 text-[0.9rem] leading-snug text-muted-foreground max-sm:mb-3 max-sm:text-[0.8rem]">
            {t.addressLine1}
            <br /> {t.addressLine2}
          </p>
          <a
            href="https://maps.app.goo.gl/uTYeTuydJYtC1T9X9?g_st=iw"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {t.openInMaps}
          </a>
        </div>
      </div>
    </section>
  )
}
