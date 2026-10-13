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
import { cn } from '@/lib/utils'

import {
  benefits,
  heroStats,
  pricingPlans,
  programSteps,
  serviceSections,
  trendingSubjects,
} from './content/services'
import { OrbitVisual } from './services/OrbitVisual'
import { useHashScroll } from './useHashScroll'

const pointIcons: Record<string, LucideIcon> = {
  'Literature Review': Layers,
  'Data Analysis': BarChart3,
  'Academic Writing': FileText,
  'Quality Assurance': Star,
  'Research Methodology': Box,
  'Customized Learning Plans': Clock,
  'Real-Time Progress Tracking': BarChart3,
  'Flexible Scheduling': CalendarClock,
  'Original Content': FileText,
  'Fast Turnaround': Clock,
  'Unlimited Revisions': RefreshCw,
  'Complicated Subjects': BookOpen,
  'Extensive Research': Sparkles,
  'Complicated Requirements': FileText,
  'Higher Difficulty Level': BarChart3,
  'Shorter Time Frame': Clock,
  'Personalized Learning Plan': Target,
  'Instructor Required': Users,
  'Number of Sessions Required': Calendar,
  'Proven Success': Rocket,
  'Expert Mentors': Target,
  'Quality Assured': Star,
  'Personalized Learning': Lightbulb,
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

export function ServicesPage() {
  useDocumentTitle('Our Services')
  useHashScroll()

  return (
    <div>
      <Hero />
      {serviceSections.map((section) => (
        <ServiceSection key={section.id} section={section} />
      ))}
      <ProgramsSection />
      <WhyChooseSection />
      <PricingSection />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <span className="absolute top-[15%] left-[10%] size-5 rotate-45 rounded-sm bg-accent shadow-md" />
        <span className="absolute top-[8%] right-[16%] size-5 rotate-45 rounded-sm bg-chart-5 shadow-md" />
        <span className="absolute bottom-[20%] left-[20%] size-5 rotate-45 rounded-sm bg-accent shadow-md" />
        <PhotoCard className="top-[20%] right-[8%]" />
        <PhotoCard className="right-[12%] bottom-[30%]" />
        <PhotoCard className="top-[60%] left-[8%]" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        <h1 className="flex flex-col gap-2 font-extrabold leading-none tracking-tight">
          <span className="bg-gradient-to-br from-primary to-primary-dark bg-clip-text text-4xl text-transparent sm:text-6xl">
            Guiding every learner
          </span>
          <span className="relative pb-3 text-3xl text-chart-5 sm:text-5xl">
            toward success
            <span className="absolute bottom-0 left-1/2 h-1 w-3/5 -translate-x-1/2 rounded-full bg-gradient-to-r from-chart-5 to-primary" />
          </span>
          <span className="mt-2 text-2xl font-semibold text-muted-foreground sm:text-4xl">
            from school to graduation
          </span>
        </h1>

        <Link to="/signup" className={cn(buttonVariants(), 'mt-10 rounded-full px-8')}>
          <Zap className="size-5" aria-hidden />
          Get Started Today
        </Link>

        <div className="mt-10">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Trending
          </h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-3">
            {trendingSubjects.map((subject) => (
              <li key={subject}>
                <span className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground">
                  {subject}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-12 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <li
              key={stat.text}
              className="flex items-center gap-3 text-left sm:flex-col sm:text-center"
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

function ServiceSection({ section }: { section: (typeof serviceSections)[number] }) {
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
                key={point.title}
                accent={section.accent}
                title={point.title}
                description={point.description}
              />
            ))}
          </div>
        </div>
        <div className={section.visualFirst ? 'lg:order-1' : undefined}>
          <OrbitVisual
            color={section.accent}
            label={`${section.badge} topics`}
            items={section.orbit.map((label) => ({
              label,
              icon: iconFor(label),
            }))}
          />
        </div>
      </div>
    </section>
  )
}

function PointCard({
  accent,
  title,
  description,
}: {
  accent: string
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
        className="absolute -top-4 -right-4 z-0 size-8 rounded-full transition-transform duration-300 group-hover:scale-[22]"
        style={{ backgroundColor: accent }}
      />
      <span
        aria-hidden
        className="absolute top-0 right-0 z-20 flex size-8 items-center justify-center rounded-bl-[32px] text-sm text-white"
        style={{ backgroundColor: accent }}
      >
        →
      </span>
      <div className="relative z-10">
        {createElement(iconFor(title), {
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
  return (
    <section id="programs" className="relative overflow-hidden bg-card py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -top-16 -right-24 size-80 rotate-6 bg-primary/10 [clip-path:polygon(0_20%,65%_0,100%_75%,45%_100%)]" />
        <span className="absolute bottom-[-80px] left-[12%] size-64 rounded-full bg-primary-light/40" />
        <span className="absolute right-[6%] bottom-[20%] size-48 rounded-3xl bg-[radial-gradient(circle,rgba(109,214,220,0.45)_2px,transparent_2px)] bg-[length:18px_18px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Coding Camps & Special Curricula
        </h2>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <ol className="flex flex-col gap-8">
            {programSteps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4">
                {index < programSteps.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-12 left-6 h-[calc(100%+0.5rem)] w-px bg-border"
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
  const positions = ['lg:top-0 lg:left-4', 'lg:top-[42%] lg:right-0', 'lg:bottom-2 lg:left-[14%]']

  return (
    <aside
      className="relative mx-auto w-full max-w-sm lg:min-h-[440px]"
      aria-label="Learning Roadmap"
    >
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
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
        {programSteps.map((step, index) => (
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
              <h3 className="text-sm font-semibold">Step {index + 1}</h3>
              <p className="text-sm text-muted-foreground">{step.title}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}

function WhyChooseSection() {
  return (
    <section className="bg-card py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Why Choose Our Services
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            We go above and beyond to ensure your academic success
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = iconFor(benefit.title)
            return (
              <Card
                key={benefit.title}
                className="group relative overflow-hidden p-6 shadow-md transition hover:shadow-lg"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-10 right-0 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition group-hover:opacity-100"
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
  return (
    <section className="relative overflow-hidden bg-muted/40 py-20">
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="bg-gradient-to-br from-primary to-foreground bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Transparent Pricing Structure
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Our services rely mainly on{' '}
            <strong className="font-semibold text-primary">timeframe</strong>,{' '}
            <strong className="font-semibold text-primary">requirements</strong>,{' '}
            <strong className="font-semibold text-primary">difficulty level</strong> and{' '}
            <strong className="font-semibold text-primary">type of subject</strong>
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.title} plan={plan} />
          ))}
        </div>

        <p className="mx-auto mt-8 flex max-w-3xl items-start justify-center gap-3 text-center text-sm text-muted-foreground">
          <DollarSign className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Our prices start with <strong className="text-foreground">$50</strong> and can vary with
            no limits according to your requirements.
          </span>
        </p>
      </div>
    </section>
  )
}

function PricingCard({ plan }: { plan: (typeof pricingPlans)[number] }) {
  const tutoring = plan.title.startsWith('Tutoring')

  return (
    <Card
      className="relative flex h-full flex-col overflow-hidden p-6 sm:p-8"
      style={{ boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-primary/10"
      />
      <div className="relative flex items-center gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {tutoring ? (
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
            const Icon = iconFor(factor)
            return (
              <li
                key={factor}
                className="flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2.5"
              >
                <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm font-medium">{factor}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}

function PriceRange({ start, max, endColor }: { start: string; max: string; endColor: string }) {
  const gradientId = useId().replace(/:/g, '')

  return (
    <div className="flex h-full w-full flex-col" aria-label={`Price range ${start} to ${max}`}>
      <div className="pr-1 text-right">
        <p className="text-lg font-bold leading-none tracking-tight sm:text-xl">{max}</p>
        <p className="mt-1 mr-5 text-xs text-muted-foreground">Maximum</p>
      </div>
      <div className="relative -mt-1 min-h-44 flex-1">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
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
          className="absolute top-[6%] left-[78%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: endColor }}
        />
        <span
          aria-hidden
          className="absolute top-[96%] left-[22%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-5"
        />
      </div>
      <div className="-mt-1">
        <p className="text-[11px] leading-none text-muted-foreground">Starting</p>
        <p className="mt-1 text-lg font-bold leading-none tracking-tight sm:text-xl">{start}</p>
      </div>
    </div>
  )
}

function iconFor(label: string): LucideIcon {
  return pointIcons[label] ?? Sparkles
}
