import { type FormEvent, type ReactNode, useState } from 'react'
import { Mail, MapPin, Phone, Send } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { type FieldErrors, parseForm } from '@/lib/form'
import { cn } from '@/lib/utils'
import { sendContactMessage, subscribeNewsletter } from '@/services/contact'

import { publicContainerClass } from '../publicContainer'
import { SocialLinks } from '../SocialLinks'
import { contactMessageSchema, type ContactMessageValues, newsletterSchema } from './contact.schema'

const emptyMessage: ContactMessageValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

export function ContactPage() {
  useDocumentTitle('Contact')

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
  return (
    <section className="bg-card py-8 max-md:py-6">
      <div className={publicContainerClass}>
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 max-lg:max-w-md max-lg:grid-cols-1">
          <InfoCard title="Visit Us" icon={MapPin}>
            Bambouk center, 6th floor,
            <br /> Bauchrieh, Lebanon
          </InfoCard>
          <InfoCard title="Email Us" icon={Mail}>
            <a href="mailto:info@original-iq.com" className="text-primary hover:underline">
              info@original-iq.com
            </a>
          </InfoCard>
          <InfoCard title="Call Us" icon={Phone}>
            <a href="tel:+96170858167" className="text-primary hover:underline">
              +(961) 70 858 167
            </a>
            <br />
            Mon-Fri: 9AM - 6PM
            <br />
            WhatsApp Support: Available 24/7
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
  return (
    <section id="support" className="bg-background py-20 max-md:py-16 max-sm:py-12">
      <div className={publicContainerClass}>
        <div className="grid grid-cols-[1.5fr_1fr] gap-12 max-lg:grid-cols-1 max-md:gap-8 max-sm:gap-6">
          <MessageForm />
          <aside className="flex flex-col gap-6 max-sm:gap-5">
            <SidebarCard title="Quick Response">
              Our support team typically responds within 2-4 hours during business hours.
            </SidebarCard>
            <SidebarCard title="24/7 Support">
              Premium plan members get round-the-clock support with priority response.
            </SidebarCard>
            <Card className="border-border p-8 shadow-sm max-sm:p-6">
              <h2 className="mb-3 text-xl font-semibold">Follow Us</h2>
              <SocialLinks
                className="mt-2 justify-center"
                linkClassName="text-foreground hover:text-primary"
              />
            </Card>
            <Card className="border-0 bg-gradient-to-br from-primary-light to-primary p-8 text-white max-sm:p-6">
              <h2 className="mb-3 text-xl font-semibold text-white">Need Immediate Help?</h2>
              <p className="mb-5 leading-[1.7] text-white/95">
                Check out our FAQ page for instant answers to common questions.
              </p>
              <Link
                to="/faq"
                className={cn(buttonVariants({ variant: 'inverse', size: 'sm' }), 'w-full')}
              >
                Visit FAQ
              </Link>
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
      setErrorMessage(error instanceof Error ? error.message : 'Could not send your message')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-12 max-md:p-8 max-sm:p-6">
      <h1 className="text-[2rem] leading-snug font-semibold max-md:text-[1.75rem] max-sm:text-2xl">
        Send Us a Message
      </h1>
      <p className="mt-3 mb-8 leading-[1.7] text-muted-foreground max-md:text-[0.95rem] max-sm:mb-6 max-sm:text-sm">
        Fill out the form below and we&apos;ll get back to you within 24 hours.
      </p>
      <Form onSubmit={onSubmit} className="gap-6" noValidate>
        <Field>
          <FieldLabel htmlFor="name">Your Name *</FieldLabel>
          <Input
            id="name"
            name="name"
            maxLength={20}
            placeholder="John Doe"
            autoComplete="name"
            value={values.name}
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email Address *</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            maxLength={100}
            placeholder="john@example.com"
            autoComplete="email"
            value={values.email}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
          />
          <FieldError>{fieldErrors.email}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="subject">Subject</FieldLabel>
          <Input
            id="subject"
            name="subject"
            maxLength={120}
            placeholder="How can we help you?"
            value={values.subject}
            aria-invalid={Boolean(fieldErrors.subject) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, subject: event.target.value }))}
          />
          <FieldError>{fieldErrors.subject}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="message">Message *</FieldLabel>
          <Textarea
            id="message"
            name="message"
            rows={6}
            maxLength={245}
            placeholder="Tell us more about your inquiry..."
            value={values.message}
            aria-invalid={Boolean(fieldErrors.message) || undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, message: event.target.value }))}
          />
          <FieldError>{fieldErrors.message}</FieldError>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          <Send className="size-5" aria-hidden />
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </Form>
      {status === 'success' ? (
        <Alert
          tone="success"
          className="mt-4"
          title="Message sent successfully! We'll get back to you soon."
        />
      ) : null}
      {status === 'error' ? (
        <Alert
          tone="danger"
          className="mt-4"
          title={errorMessage ?? 'Could not send your message'}
        />
      ) : null}
    </Card>
  )
}

function Newsletter() {
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
      setErrorMessage(failure instanceof Error ? failure.message : 'Could not subscribe')
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
              Stay Updated
            </h2>
            <p className="mt-4 text-[1.1rem] leading-relaxed text-white/90 max-md:text-base max-sm:text-[0.95rem]">
              Get the latest updates, tips, and exclusive content delivered to your inbox.
            </p>
          </div>
          <Form onSubmit={onSubmit} className="w-full max-w-[500px] flex-1 gap-0" noValidate>
            <div className="flex gap-3 max-md:flex-col max-md:gap-4">
              <div className="min-w-0 flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  autoComplete="email"
                  value={email}
                  aria-invalid={Boolean(error) || undefined}
                  className="h-14 border-2 border-white/20 bg-white/95 px-5 text-base"
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
                <Send className="size-5" aria-hidden />
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </div>
            <FieldError>{error}</FieldError>
            {status === 'success' ? (
              <Alert
                tone="success"
                className="mt-4"
                title="You're subscribed. We'll send the latest updates to your inbox."
              />
            ) : null}
            {status === 'error' ? (
              <Alert tone="danger" className="mt-4" title={errorMessage ?? 'Could not subscribe'} />
            ) : null}
          </Form>
        </div>
      </div>
    </section>
  )
}

function LocationMap() {
  return (
    <section className="relative h-[400px] overflow-hidden max-md:h-[300px] max-sm:h-[250px]">
      <iframe
        title="Original IQ on the map"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3312.033378126204!2d35.5588469!3d33.8887942!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151f1623b8f3ed5f%3A0x24f9905a080fc6b!2sNBC%20Computers!5e0!3m2!1sen!2slb!4v1763436178288!5m2!1sen!2slb"
        className="h-full w-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute top-5 right-5 z-[2] max-w-[300px] max-md:inset-x-2.5 max-md:top-2.5 max-md:max-w-none max-sm:inset-x-2 max-sm:top-2">
        <div className="rounded-lg border border-white/20 bg-white/95 p-6 text-center shadow-lg backdrop-blur-md max-md:p-4 max-sm:p-3.5">
          <MapPin
            className="mx-auto mb-4 size-12 text-primary max-sm:mb-2 max-sm:size-9"
            aria-hidden
          />
          <h2 className="mb-2 text-xl font-semibold max-md:text-[1.1rem] max-sm:mb-1 max-sm:text-base">
            Our Location
          </h2>
          <p className="mb-4 text-[0.9rem] leading-snug text-muted-foreground max-sm:mb-3 max-sm:text-[0.8rem]">
            Bambouk center, 6th floor,
            <br /> Bauchrieh, Lebanon
          </p>
          <a
            href="https://maps.app.goo.gl/uTYeTuydJYtC1T9X9?g_st=iw"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Open in Maps
          </a>
        </div>
      </div>
    </section>
  )
}
