import { createElement, type CSSProperties, useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Box,
  Calendar,
  CalendarClock,
  Clock,
  Diamond,
  DollarSign,
  FileText,
  Layers,
  Lightbulb,
  RefreshCw,
  Rocket,
  Sparkles,
  Star,
  Target,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

import {
  type PricingPlan,
  type ServiceIconKey,
  servicesContent,
  type ServiceSection as ServiceSectionContent,
} from './content/services'
import { usePublicDictionary } from './i18n'
import { OrbitVisual } from './services/OrbitVisual'
import { useHashScroll } from './useHashScroll'

const serviceIcons: Record<ServiceIconKey, LucideIcon> = {
  literatureReview: Layers,
  dataAnalysis: BarChart3,
  academicWriting: FileText,
  qualityAssurance: Star,
  researchMethodology: Box,
  learningPlans: Clock,
  progressTracking: BarChart3,
  flexibleScheduling: CalendarClock,
  originalContent: FileText,
  fastTurnaround: Clock,
  unlimitedRevisions: RefreshCw,
  complicatedSubjects: BookOpen,
  extensiveResearch: Sparkles,
  complicatedRequirements: FileText,
  higherDifficulty: BarChart3,
  shorterTimeFrame: Clock,
  personalizedPlan: Target,
  instructorRequired: Users,
  sessionsRequired: Calendar,
  provenSuccess: Rocket,
  expertMentors: Target,
  qualityAssured: Star,
  personalizedLearning: Lightbulb,
}

const statTones = {
  success: 'bg-chart-5/10 text-chart-5',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/10 text-warning',
} as const

const dottedBackground = {
  backgroundImage:
    'radial-gradient(color-mix(in srgb, var(--muted-foreground) 30%, transparent) 2px, transparent 0)',
  backgroundSize: '30px 30px',
} satisfies CSSProperties

function useServices() {
  const { pick } = useI18n()
  return { content: pick(servicesContent), t: usePublicDictionary().services }
}

export function ServicesPage() {
  const { content, t } = useServices()
  useDocumentTitle(t.documentTitle)
  useHashScroll()

  return (
    <div>
      <Hero />
      {content.serviceSections.map((section) => (
        <ServiceSection key={section.id} section={section} />
      ))}
      <ProgramsSection />
      <WhyChooseSection />
      <PricingSection />
    </div>
  )
}

function Hero() {
  const { content, t } = useServices()

  return (
    <section className="relative overflow-hidden bg-background py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <span className="absolute top-[15%] start-[10%] size-5 rotate-45 rounded-sm bg-accent shadow-md" />
        <span className="absolute top-[8%] end-[16%] size-5 rotate-45 rounded-sm bg-chart-5 shadow-md" />
        <span className="absolute bottom-[20%] start-[20%] size-5 rotate-45 rounded-sm bg-accent shadow-md" />
        <PhotoCard className="top-[20%] end-[8%]" />
        <PhotoCard className="end-[12%] bottom-[30%]" />
        <PhotoCard className="top-[60%] start-[8%]" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        <h1 className="flex flex-col gap-2 font-extrabold leading-none tracking-tight">
          <span className="bg-gradient-to-br from-primary to-primary-dark bg-clip-text text-4xl text-transparent sm:text-6xl">
            {t.heroLine1}
          </span>
          <span className="relative pb-3 text-3xl text-chart-5 sm:text-5xl">
            {t.heroLine2}
            <span className="absolute bottom-0 left-1/2 h-1 w-3/5 -translate-x-1/2 rounded-full from-chart-5 to-primary ltr:bg-gradient-to-r rtl:bg-gradient-to-l" />
          </span>
          <span className="mt-2 text-2xl font-semibold text-muted-foreground sm:text-4xl">
            {t.heroLine3}
          </span>
        </h1>

        <Link to="/signup" className={cn(buttonVariants(), 'mt-10 rounded-full px-8')}>
          <Zap className="size-5" aria-hidden />
          {t.getStarted}
        </Link>

        <div className="mt-10">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.trending}
          </h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-3">
            {content.trendingSubjects.map((subject) => (
              <li key={subject}>
                <span className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground">
                  <bdi>{subject}</bdi>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-12 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          {content.heroStats.map((stat) => (
            <li
              key={stat.text}
              className="flex items-center gap-3 text-start sm:flex-col sm:text-center"
            >
              <span
                className={cn(
                  'inline-flex size-10 shrink-0 items-center justify-center rounded-md',
                  statTones[stat.tone],
                )}
              >
                <Diamond className="size-4 fill-current" aria-hidden />
              </span>
              <p className="text-sm font-semibold">{stat.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function PhotoCard({ className }: { className: string }) {
  return (
    <span
      className={cn(
        'absolute flex size-20 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-lg',
        className,
      )}
    >
      <User className="size-8" />
    </span>
  )
}

function ServiceSection({ section }: { section: ServiceSectionContent }) {
  const { t } = useServices()

  return (
    <section id={section.id} className="scroll-mt-20 py-16" style={dottedBackground}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
        <div className={section.visualFirst ? 'lg:order-2' : undefined}>
          <Badge
            className="rounded-full px-4 py-1 text-sm font-semibold"
            style={{ backgroundColor: section.accentLight, color: 'var(--primary-foreground)' }}
          >
            {section.badge}
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {section.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {section.description}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {section.points.map((point) => (
              <PointCard
                key={point.icon}
                accent={section.accent}
                icon={serviceIcons[point.icon]}
                title={point.title}
                description={point.description}
              />
            ))}
          </div>
        </div>
        <div className={section.visualFirst ? 'lg:order-1' : undefined}>
          <OrbitVisual
            color={section.accent}
            label={t.topicsLabel(section.badge)}
            items={section.orbit.map((item) => ({
              label: item.label,
              icon: serviceIcons[item.icon],
            }))}
          />
        </div>
      </div>
    </section>
  )
}

function PointCard({
  accent,
  icon,
  title,
  description,
}: {
  accent: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <article
      className="group relative overflow-hidden rounded-sm bg-muted p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ '--point': accent } as CSSProperties}
    >
      <span
        aria-hidden
        className="absolute -top-4 -end-4 z-0 size-8 rounded-full transition-transform duration-300 group-hover:scale-[22]"
        style={{ backgroundColor: accent }}
      />
      <span
        aria-hidden
        className="absolute top-0 end-0 z-20 flex size-8 items-center justify-center rounded-es-[32px] text-sm text-white"
        style={{ backgroundColor: accent }}
      >
        <span className="inline-block rtl:-scale-x-100">→</span>
      </span>
      <div className="relative z-10">
        {createElement(icon, {
          className: 'size-10 text-[var(--point)] transition group-hover:text-white!',
          'aria-hidden': true,
        })}
        <h3 className="mt-3 text-base font-semibold transition group-hover:text-white!">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground transition group-hover:text-white/80!">
          {description}
        </p>
      </div>
    </article>
  )
}

function ProgramsSection() {
  const { content, t } = useServices()

  return (
    <section id="programs" className="relative overflow-hidden bg-card py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -top-16 -end-24 size-80 rotate-6 bg-primary/10 [clip-path:polygon(0_20%,65%_0,100%_75%,45%_100%)]" />
        <span className="absolute bottom-[-80px] start-[12%] size-64 rounded-full bg-primary-light/40" />
        <span className="absolute end-[6%] bottom-[20%] size-48 rounded-3xl bg-[radial-gradient(circle,rgba(109,214,220,0.45)_2px,transparent_2px)] bg-[length:18px_18px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.programsTitle}
        </h2>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <ol className="flex flex-col gap-8">
            {content.programSteps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4">
                {index < content.programSteps.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-12 start-6 h-[calc(100%+0.5rem)] w-px bg-border"
                  />
                ) : null}
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-lg font-semibold shadow-md">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Roadmap />
        </div>
      </div>
    </section>
  )
}

function Roadmap() {
  const { content, t } = useServices()
  const positions = ['lg:top-0 lg:start-4', 'lg:top-[42%] lg:end-0', 'lg:bottom-2 lg:start-[14%]']

  return (
    <aside
      className="relative mx-auto w-full max-w-sm lg:min-h-[440px]"
      aria-label={t.roadmapLabel}
    >
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full rtl:-scale-x-100 lg:block"
        viewBox="0 0 320 520"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M30 30 C140 110, 40 210, 160 280"
          fill="none"
          stroke="var(--primary-light)"
          strokeOpacity="0.7"
          strokeWidth="2.5"
        />
        <path
          d="M90 180 C200 240, 120 320, 250 420"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
      </svg>
      <ol className="flex flex-col gap-4 lg:block">
        {content.programSteps.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              'flex w-full gap-3 rounded-2xl bg-card p-4 shadow-lg lg:absolute lg:w-60',
              positions[index],
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold">{t.step(index + 1)}</h3>
              <p className="text-sm text-muted-foreground">{step.title}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}

function WhyChooseSection() {
  const { content, t } = useServices()

  return (
    <section className="bg-card py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.whyTitle}</h2>
          <p className="mt-3 text-base text-muted-foreground">{t.whyIntro}</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {content.benefits.map((benefit) => {
            const Icon = serviceIcons[benefit.icon]
            return (
              <Card
                key={benefit.icon}
                className="group relative overflow-hidden p-6 shadow-md transition hover:shadow-lg"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-10 end-0 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition group-hover:opacity-100"
                />
                <span className="relative inline-flex rounded-full border border-border bg-muted/60 p-2 text-muted-foreground transition group-hover:text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="relative mt-4 text-base font-semibold">{benefit.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const { content, t } = useServices()
  const intro = t.pricingIntro
  const strong = 'font-semibold text-primary'

  return (
    <section className="relative overflow-hidden bg-muted/40 py-20">
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="bg-gradient-to-br from-primary to-foreground bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            {t.pricingTitle}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {intro.lead} <strong className={strong}>{intro.timeframe}</strong>
            {intro.comma} <strong className={strong}>{intro.requirements}</strong>
            {intro.comma} <strong className={strong}>{intro.difficulty}</strong> {intro.and}
            <strong className={strong}>{intro.subject}</strong>
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
          {content.pricingPlans.map((plan) => (
            <PricingCard key={plan.kind} plan={plan} />
          ))}
        </div>

        <p className="mx-auto mt-8 flex max-w-3xl items-start justify-center gap-3 text-center text-sm text-muted-foreground">
          <DollarSign className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            {t.pricingNote.lead}{' '}
            <strong className="text-foreground">
              <bdi dir="ltr">{t.pricingNote.amount}</bdi>
            </strong>{' '}
            {t.pricingNote.tail}
          </span>
        </p>
      </div>
    </section>
  )
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <Card
      className="relative flex h-full flex-col overflow-hidden p-6 sm:p-8"
      style={{ boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -start-16 size-56 rounded-full bg-primary/10"
      />
      <div className="relative flex items-center gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {plan.kind === 'tutoring' ? (
            <Users className="size-5" aria-hidden />
          ) : (
            <FileText className="size-5" aria-hidden />
          )}
        </span>
        <h3 className="text-base font-semibold tracking-tight sm:text-lg">{plan.title}</h3>
      </div>
      <div className="relative mt-8 grid flex-1 grid-cols-[7.5rem_minmax(0,1fr)] items-stretch gap-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
        <PriceRange start={plan.start} max={plan.max} endColor={plan.endColor} />
        <ul className="flex h-full min-h-56 flex-col justify-between gap-2.5">
          {plan.factors.map((factor) => {
            const Icon = serviceIcons[factor.icon]
            return (
              <li
                key={factor.icon}
                className="flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2.5"
              >
                <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm font-medium">{factor.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}

function PriceRange({ start, max, endColor }: { start: string; max: string; endColor: string }) {
  const { t } = useServices()
  const gradientId = useId().replace(/:/g, '')

  return (
    <div className="flex h-full w-full flex-col" aria-label={t.priceRangeLabel(start, max)}>
      <div className="pe-1 text-end">
        <p className="text-lg font-bold leading-none tracking-tight sm:text-xl">
          <bdi dir="ltr">{max}</bdi>
        </p>
        <p className="mt-1 me-5 text-xs text-muted-foreground">{t.maximum}</p>
      </div>
      <div className="relative -mt-1 min-h-44 flex-1">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full rtl:-scale-x-100"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="22"
              y1="98"
              x2="78"
              y2="4"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="var(--chart-5)" />
              <stop offset="46%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor={endColor} />
            </linearGradient>
          </defs>
          <path
            d="M22 96 Q 2 52, 78 6"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden
          className="absolute top-[6%] start-[78%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full rtl:translate-x-1/2"
          style={{ backgroundColor: endColor }}
        />
        <span
          aria-hidden
          className="absolute top-[96%] start-[22%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-5 rtl:translate-x-1/2"
        />
      </div>
      <div className="-mt-1">
        <p className="text-[11px] leading-none text-muted-foreground">{t.starting}</p>
        <p className="mt-1 text-lg font-bold leading-none tracking-tight sm:text-xl">
          <bdi dir="ltr">{start}</bdi>
        </p>
      </div>
    </div>
  )
}
