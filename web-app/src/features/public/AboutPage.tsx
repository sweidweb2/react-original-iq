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
  Shield,
  User,
  Users,
  Zap,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

import { usePublicDictionary } from './i18n'

const PAYMENT_IBAN = 'LB12 3456 7890 1234 5678 9012 3456'
const PAYMENT_WHISH_PHONE = '+961 3 123 456'
const PAYMENT_WHISH_NAME = 'Original IQ'
const APPLY_URL = 'https://forms.gle/1T9au5gptw4bLbPZA'

type PaymentCopyKey = 'iban' | 'phone' | 'whishName'

const statTones = ['text-chart-5', 'text-accent', 'text-warning', 'text-chart-5', 'text-accent']

const stepIcons: LucideIcon[] = [ClipboardCheck, Lock, CircleCheck]

const benefitIcons: LucideIcon[] = [Layers, CircleCheck, Check, Users]

const diamonds = [
  { tone: 'orange', position: 'top-[10%] start-[5%] [animation-delay:0s]' },
  { tone: 'green', position: 'top-[20%] end-[8%] [animation-delay:1.5s]' },
  { tone: 'orange', position: 'bottom-[25%] start-[3%] [animation-delay:3s]' },
  { tone: 'green', position: 'bottom-[15%] end-[5%] [animation-delay:4.5s]' },
] as const

const portraits = [
  'top-[15%] end-[2%] rotate-[15deg]',
  'top-[60%] start-[1%] -rotate-[10deg]',
  'bottom-[20%] end-[12%] rotate-[8deg]',
  'top-[40%] start-[8%] -rotate-12',
]

export function AboutPage() {
  const t = usePublicDictionary().about
  useDocumentTitle(t.documentTitle)
  const [copied, setCopied] = useState<PaymentCopyKey | null>(null)

  async function copyValue(kind: PaymentCopyKey, value: string) {
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
            {t.titleLead}{' '}
            <span className="bg-gradient-to-br from-primary to-primary-light bg-clip-text text-transparent">
              OriginaliQ
            </span>
          </h1>
          <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">{t.intro}</p>
        </div>
      </section>

      <section className="bg-card px-4 py-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
          <StoryCard
            title={t.missionTitle}
            tone="primary"
            icon={CircleCheck}
            description={t.mission}
          />
          <StoryCard title={t.visionTitle} tone="accent" icon={Eye} description={t.vision} />
        </div>
      </section>

      <section className="relative overflow-hidden bg-background px-4 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          {diamonds.map((diamond) => (
            <span
              key={diamond.position}
              className={cn(
                'about-float absolute size-12 rounded-lg xl:size-14',
                diamond.tone === 'orange' ? 'bg-accent shadow-md' : 'bg-chart-5 shadow-md',
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
          <p className="text-base text-primary">{t.aboutUs}</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {t.passion}
          </h2>
          <img
            src="/marketing/about-team.webp"
            alt={t.teamImageAlt}
            width={1200}
            height={799}
            fetchPriority="high"
            className="mx-auto mt-10 h-auto w-full max-w-4xl rounded-lg object-cover shadow-lg"
          />
          <dl className="mx-auto mt-10 flex max-w-4xl flex-col items-center justify-around gap-8 rounded-lg border border-border bg-card px-4 py-8 shadow-md sm:flex-row sm:flex-wrap sm:py-12">
            {t.stats.map((stat, index) => (
              <div key={stat.label} className="min-w-28 text-center">
                <dt className={cn('text-2xl leading-none', statTones[index])} aria-hidden>
                  ◆
                </dt>
                <dd className="mt-2 text-3xl font-semibold text-primary sm:text-4xl">
                  <bdi dir="ltr">{stat.value}</bdi>
                </dd>
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
              {t.paymentBadge}
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.paymentTitle}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{t.paymentIntro}</p>
          </header>

          <div className="grid gap-8 md:grid-cols-2">
            <PaymentCard
              title={t.bankCard.title}
              description={t.bankCard.description}
              fields={[
                {
                  key: 'iban',
                  label: t.bankCard.label,
                  value: PAYMENT_IBAN,
                  copyValue: PAYMENT_IBAN.replace(/\s/g, ''),
                },
              ]}
              copied={copied}
              onCopy={copyValue}
              iconSrc="/marketing/visa-logo.jpg"
              iconAlt="Visa"
              feature={t.bankCard.feature}
              featureIcon={Shield}
            />
            <PaymentCard
              title={t.whishCard.title}
              description={t.whishCard.description}
              fields={[
                {
                  key: 'phone',
                  label: t.whishCard.label,
                  value: PAYMENT_WHISH_PHONE,
                },
                {
                  key: 'whishName',
                  label: t.whishCard.nameLabel,
                  value: PAYMENT_WHISH_NAME,
                },
              ]}
              fieldsLayout="row"
              copied={copied}
              onCopy={copyValue}
              iconSrc="/marketing/whish-icon.png"
              iconAlt="Whish"
              feature={t.whishCard.feature}
              featureIcon={Zap}
            />
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10 text-center">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              {t.onlinePayment}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.stepsTitle}
            </h2>
          </header>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <ol className="flex flex-col gap-8">
              {t.steps.map((step, index) => {
                const Icon = stepIcons[index] ?? CircleCheck
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
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="lg:sticky lg:top-24">
              <img
                src="/marketing/payment-online.webp"
                alt={t.paymentImageAlt}
                width={896}
                height={720}
                loading="lazy"
                decoding="async"
                className="mx-auto h-auto w-full max-w-md rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-background to-card px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto mb-12 max-w-3xl text-center">
            <p className="inline-flex rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-white">
              {t.whyJoinBadge}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.whyJoinTitle}
            </h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">{t.whyJoinIntro}</p>
          </header>

          <div className="grid justify-items-center gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {t.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index] ?? Layers
              return (
                <Card
                  key={benefit.title}
                  className="relative w-full max-w-64 overflow-hidden p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="absolute -top-7 -end-5 flex size-24 items-end justify-start rounded-full bg-primary ps-7 pb-6 text-2xl text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon className="size-12 text-primary" aria-hidden />
                  <h3 className="mt-3 text-xl font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {benefit.description}
                  </p>
                </Card>
              )
            })}
          </div>

          <div className="relative mt-14 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-dark px-6 py-12 text-center text-white">
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.05)_20px,rgba(255,255,255,0.05)_40px)]" />
            <div className="relative">
              <h3 className="text-2xl font-semibold sm:text-3xl">{t.joinTitle}</h3>
              <p className="mx-auto mt-3 max-w-xl text-base text-white/90">{t.joinBody}</p>
              <a
                href={APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'inverse', size: 'lg' }), 'mt-6')}
              >
                <Zap className="size-5" aria-hidden />
                {t.applyNow}
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
          'absolute end-5 bottom-5 size-2 rounded-full opacity-60',
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
  fields,
  fieldsLayout = 'stack',
  copied,
  onCopy,
  iconSrc,
  iconAlt,
  feature,
  featureIcon: FeatureIcon,
}: {
  title: string
  description: string
  fields: Array<{
    key: PaymentCopyKey
    label: string
    value: string
    copyValue?: string
  }>
  fieldsLayout?: 'stack' | 'row'
  copied: PaymentCopyKey | null
  onCopy: (kind: PaymentCopyKey, value: string) => void
  iconSrc?: string
  iconAlt?: string
  feature: string
  featureIcon: LucideIcon
}) {
  const t = usePublicDictionary().about

  return (
    <Card className="group relative overflow-hidden border-2 p-8 shadow-md transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:scale-x-0 before:from-primary before:to-accent before:transition before:duration-300 before:content-[''] hover:-translate-y-2 hover:border-primary hover:shadow-lg hover:before:scale-x-100 sm:p-10 ltr:before:origin-left ltr:before:bg-gradient-to-r rtl:before:origin-right rtl:before:bg-gradient-to-l">
      <div className="flex items-center gap-4">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={iconAlt ?? ''}
            width={72}
            height={30}
            className="h-10 w-auto shrink-0 rounded-md object-contain transition group-hover:scale-110"
          />
        ) : null}
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <p className="mt-5 text-base leading-7 text-muted-foreground">{description}</p>
      <div
        className={cn(
          'mt-6 gap-4',
          fieldsLayout === 'row' ? 'grid grid-cols-2' : 'flex flex-col gap-5',
        )}
      >
        {fields.map((field) => (
          <div key={field.key} className="relative min-w-0">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {field.label}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-3 sm:px-4">
              <p
                dir="ltr"
                className="min-w-0 flex-1 font-mono text-sm font-semibold tracking-wide break-all"
              >
                {field.value}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                aria-label={t.copyLabel(field.label)}
                onClick={() => onCopy(field.key, field.copyValue ?? field.value)}
              >
                <Copy className="size-5" aria-hidden />
              </button>
            </div>
            {copied === field.key ? (
              <p
                role="status"
                className="mt-2 flex items-center justify-center gap-2 rounded-md bg-chart-5 px-3 py-2 text-sm font-semibold text-white"
              >
                <Check className="size-4" aria-hidden />
                {t.copied}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
        <FeatureIcon className="size-4 text-chart-5" aria-hidden />
        {feature}
      </div>
    </Card>
  )
}
