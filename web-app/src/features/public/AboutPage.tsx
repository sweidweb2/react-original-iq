import './about.css'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  CircleCheck,
  ClipboardCheck,
  Copy,
  Eye,
  Layers,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  Users,
  Zap,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

const PAYMENT_EMAIL = 'info@original-iq.com'
const PAYMENT_PHONE = '+961 70 858 167'
const APPLY_URL = 'https://forms.gle/1T9au5gptw4bLbPZA'

const stats = [
  { tone: 'text-chart-5', value: '100+', label: 'employees' },
  { tone: 'text-accent', value: '15+', label: 'countries' },
  { tone: 'text-warning', value: '60+', label: 'projects done' },
  { tone: 'text-chart-5', value: '500+', label: 'graduates' },
  { tone: 'text-accent', value: '25+', label: 'project awards' },
] as const

const steps = [
  {
    title: 'Choose Your Payment Method',
    description: 'Select your preferred payment method, such as credit card, debit card, or digital wallet.',
    icon: ClipboardCheck,
  },
  {
    title: 'Enter Payment Details',
    description: 'Securely enter your card number, expiration date, and security code in the payment form.',
    icon: Lock,
  },
  {
    title: 'Confirm Your Payment',
    description: 'Review the payment summary and click "Confirm" to complete your transaction.',
    icon: CircleCheck,
  },
] as const

const benefits: Array<{ number: string; title: string; description: string; icon: LucideIcon }> = [
  {
    number: '01',
    title: 'Trusted & Registered',
    description: 'Study with confidence through a registered company that upholds international academic standards.',
    icon: Layers,
  },
  {
    number: '02',
    title: 'Flexible Learning',
    description: 'Learn anytime, anywhere, with study plans that adapt to your schedule and learning pace.',
    icon: CircleCheck,
  },
  {
    number: '03',
    title: 'Value & Quality',
    description: 'Receive top-quality academic support that offers real value for your investment in education.',
    icon: Check,
  },
  {
    number: '04',
    title: 'Continuous Support',
    description: 'Enjoy ongoing guidance throughout your academic journey for consistent growth and results.',
    icon: Users,
  },
]

const diamonds = [
  { tone: 'orange', position: 'top-[10%] left-[5%] [animation-delay:0s]' },
  { tone: 'green', position: 'top-[20%] right-[8%] [animation-delay:1.5s]' },
  { tone: 'orange', position: 'bottom-[25%] left-[3%] [animation-delay:3s]' },
  { tone: 'green', position: 'bottom-[15%] right-[5%] [animation-delay:4.5s]' },
] as const

const portraits = [
  'top-[15%] right-[2%] rotate-[15deg]',
  'top-[60%] left-[1%] -rotate-[10deg]',
  'bottom-[20%] right-[12%] rotate-[8deg]',
  'top-[40%] left-[8%] -rotate-12',
]

export function AboutPage() {
  useDocumentTitle('About')
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null)

  async function copyValue(kind: 'email' | 'phone', value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div>
      <section className="relative overflow-hidden px-4 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,var(--sidebar-accent)_0%,var(--primary-light)_50%,var(--sidebar-accent)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_30px,rgba(52,184,193,0.03)_30px,rgba(52,184,193,0.03)_60px)]" />
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            About{' '}
            <span className="bg-gradient-to-br from-primary to-primary-light bg-clip-text text-transparent">
              OriginaliQ
            </span>
          </h1>
          <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">
            A registered company based in Lebanon 🇱🇧, now developing its Consultancy Department for academic
            consultants. We proudly serve students locally and across the Gulf 🌍.
          </p>
        </div>
      </section>

      <section className="bg-card px-4 py-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
          <StoryCard
            title="Our Mission"
            tone="primary"
            icon={CircleCheck}
            description="Original IQ is dedicated to empowering students and professionals through personalized academic guidance. Our Consultancy Department provides structured support for learners at every stage, helping them achieve their educational goals with confidence."
          />
          <StoryCard
            title="Our Vision"
            tone="accent"
            icon={Eye}
            description="To become the leading global platform for academic excellence, where every student has access to world-class educational support and guidance. We envision a future where learning barriers are eliminated, and every individual can achieve their full academic potential through our innovative, personalized approach to education."
          />
        </div>
      </section>

      <section className="relative overflow-hidden bg-background px-4 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          {diamonds.map((diamond) => (
            <span
              key={diamond.position}
              className={cn(
                'about-float absolute size-12 rounded-lg xl:size-14',
                diamond.tone === 'orange'
                  ? 'bg-accent shadow-md'
                  : 'bg-chart-5 shadow-md',
                diamond.position,
              )}
            />
          ))}
          {portraits.map((position) => (
            <span
              key={position}
              className={cn(
                'absolute flex size-16 items-center justify-center rounded-xl border-2 border-border bg-card shadow-md xl:size-20',
                position,
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-white xl:size-10">
                <User className="size-4" />
              </span>
            </span>
          ))}
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-base text-primary">About Us</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Helping and Guiding You to Success is Our Passion.
          </h2>
          <img
            src="/marketing/about-team.png"
            alt="Professional team working together"
            className="mx-auto mt-10 w-full max-w-4xl rounded-lg object-cover shadow-lg"
          />
          <dl className="mx-auto mt-10 flex max-w-4xl flex-col items-center justify-around gap-8 rounded-lg border border-border bg-card px-4 py-8 shadow-md sm:flex-row sm:flex-wrap sm:py-12">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-28 text-center">
                <dt className={cn('text-2xl leading-none', stat.tone)} aria-hidden>
                  ◆
                </dt>
                <dd className="mt-2 text-3xl font-semibold text-primary sm:text-4xl">{stat.value}</dd>
                <dd className="mt-1 text-sm lowercase text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-muted px-4 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(52,184,193,0.05),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(255,107,53,0.05),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl">
          <header className="mx-auto mb-12 max-w-xl text-center">
            <p className="inline-flex rounded-full bg-gradient-to-br from-primary to-primary-dark px-5 py-2 text-xs font-semibold tracking-wide text-white uppercase shadow-[var(--shadow-primary)]">
              Payment Methods
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Payment Methods</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Ask us about payment by email or WhatsApp. We share the right details for your request.
            </p>
          </header>

          <div className="grid gap-8 md:grid-cols-2">
            <PaymentCard
              title="Email"
              description="Send payment questions to our team. We reply from the address below."
              label="Email"
              value={PAYMENT_EMAIL}
              copied={copied === 'email'}
              onCopy={() => copyValue('email', PAYMENT_EMAIL)}
              icon={Mail}
              iconClass="bg-gradient-to-br from-primary to-primary-dark"
              feature="We reply by email"
              featureIcon={Shield}
            />
            <PaymentCard
              title="WhatsApp"
              description="Message us on WhatsApp for payment help. This is the number we answer."
              label="WhatsApp"
              value={PAYMENT_PHONE}
              copied={copied === 'phone'}
              onCopy={() => copyValue('phone', PAYMENT_PHONE)}
              icon={Phone}
              iconClass="bg-accent"
              feature="Same number as our contact page"
              featureIcon={Zap}
            />
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10 text-center">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Online Payment</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Just 3 steps to get started</h2>
          </header>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <ol className="flex flex-col gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">
                        <span className="text-primary">{index + 1}. </span>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="lg:sticky lg:top-24">
              <img
                src="/marketing/payment-online.png"
                alt="Online Payment"
                className="mx-auto w-full max-w-md rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-background to-card px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto mb-12 max-w-3xl text-center">
            <p className="inline-flex rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-white">
              Why Join
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Why OriginaliQ</h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              Be part of a registered company with international reach and make a difference in students&apos; lives.
            </p>
          </header>

          <div className="grid justify-items-center gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <Card
                  key={benefit.number}
                  className="relative w-full max-w-64 overflow-hidden p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="absolute -top-7 -right-5 flex size-24 items-end justify-start rounded-full bg-primary pb-6 pl-7 text-2xl text-white">
                    {benefit.number}
                  </span>
                  <Icon className="size-12 text-primary" aria-hidden />
                  <h3 className="mt-3 text-xl font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.description}</p>
                </Card>
              )
            })}
          </div>

          <div className="relative mt-14 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-dark px-6 py-12 text-center text-white">
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.05)_20px,rgba(255,255,255,0.05)_40px)]" />
            <div className="relative">
              <h3 className="text-2xl font-semibold sm:text-3xl">Ready to Join Our Team?</h3>
              <p className="mx-auto mt-3 max-w-xl text-base text-white/90">
                If you&apos;re interested, please register by filling out our Google Form
              </p>
              <a
                href={APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'inverse', size: 'lg' }), 'mt-6')}
              >
                <Zap className="size-5" aria-hidden />
                Apply Now
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function StoryCard({
  title,
  description,
  icon: Icon,
  tone,
}: {
  title: string
  description: string
  icon: LucideIcon
  tone: 'primary' | 'accent'
}) {
  return (
    <Card className="relative overflow-hidden p-8 shadow-lg transition hover:-translate-y-1 sm:p-12">
      <div className="flex items-center gap-4 sm:gap-6">
        <span
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full text-white sm:size-16',
            tone === 'primary'
              ? 'bg-gradient-to-br from-primary to-primary-dark shadow-[var(--shadow-primary)]'
              : 'bg-accent shadow-md',
          )}
        >
          <Icon className="size-7" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
      <p className="mt-6 text-base leading-8 text-muted-foreground">{description}</p>
      <span
        className={cn(
          'absolute right-5 bottom-5 size-2 rounded-full opacity-60',
          tone === 'primary' ? 'bg-primary-light' : 'bg-accent',
        )}
        aria-hidden
      />
    </Card>
  )
}

function PaymentCard({
  title,
  description,
  label,
  value,
  copied,
  onCopy,
  icon: Icon,
  iconClass,
  feature,
  featureIcon: FeatureIcon,
}: {
  title: string
  description: string
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  icon: LucideIcon
  iconClass: string
  feature: string
  featureIcon: LucideIcon
}) {
  return (
    <Card className="group relative overflow-hidden border-2 p-8 shadow-md transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:origin-left before:scale-x-0 before:bg-gradient-to-r before:from-primary before:to-accent before:transition before:duration-300 before:content-[''] hover:-translate-y-2 hover:border-primary hover:shadow-lg hover:before:scale-x-100 sm:p-10">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-xl text-white transition group-hover:scale-110 group-hover:rotate-3',
            iconClass,
          )}
        >
          <Icon className="size-7" aria-hidden />
        </span>
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <p className="mt-5 text-base leading-7 text-muted-foreground">{description}</p>
      <div className="relative mt-6">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-sm font-semibold tracking-wide break-all">{value}</p>
          <Button size="sm" aria-label={`Copy ${label}`} onClick={onCopy}>
            <Copy className="size-4" aria-hidden />
            Copy
          </Button>
        </div>
        {copied ? (
          <p role="status" className="mt-2 flex items-center justify-center gap-2 rounded-md bg-chart-5 px-3 py-2 text-sm font-semibold text-white">
            <Check className="size-4" aria-hidden />
            Copied!
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
        <FeatureIcon className="size-4 text-chart-5" aria-hidden />
        {feature}
      </div>
    </Card>
  )
}
