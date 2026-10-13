import type { LucideIcon } from 'lucide-react'
import { Activity, Calendar, Clock, Layers, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { heroHighlights, heroStats } from '../content'

const highlightIcons: LucideIcon[] = [Layers, Activity, Clock, Sparkles, Calendar]

type HeroSectionProps = {
  onOpenLead: () => void
}

export function HeroSection({ onOpenLead }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-0 max-lg:pb-16 max-md:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(circle at 20% 30%, rgba(52, 184, 193, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 70%, rgba(109, 214, 220, 0.12) 0%, transparent 40%)',
              'radial-gradient(circle at 60% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 35%)',
            ].join(', '),
          }}
        />
        <div className="home-spin absolute -top-1/2 -right-[20%] h-[150%] w-[80%] bg-[radial-gradient(circle,rgba(109,214,220,0.3)_0%,transparent_70%)]" />
        <div className="home-float absolute top-[10%] left-[5%] h-20 w-28 rounded-[20px] bg-gradient-to-br from-primary/20 to-primary-light/10" />
        <div className="home-pulse absolute right-[10%] bottom-[20%] size-16 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.15),transparent)]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-12 px-8 max-lg:text-center sm:px-12 lg:flex-row lg:items-center lg:justify-center lg:gap-24 lg:px-16 xl:px-20">
        <div className="w-full max-w-md shrink-0 max-lg:order-1 max-lg:pb-8">
          <h1 className="mb-6 text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Learn{' '}
            <span className="bg-gradient-to-br from-primary to-primary-light bg-clip-text text-transparent">
              Smarter
            </span>
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground max-lg:mx-auto max-md:text-base">
            Tailored guidance and flexible learning to boost your results.
          </p>
          <div className="mb-12 flex flex-col items-start gap-4 max-lg:mb-10 max-lg:items-center">
            <Link
              to="/signup"
              className={cn(buttonVariants({ size: 'lg' }), 'w-full max-w-[400px]')}
            >
              Join Our Community - Sign Up Now
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full max-w-[400px]"
              onClick={onOpenLead}
            >
              Immediate Help? Leave Your Number
            </Button>
          </div>
          <dl className="flex gap-12 max-lg:hidden">
            {heroStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="mb-1 text-3xl font-semibold text-primary">{stat.value}</dt>
                <dd className="text-sm text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-8 max-lg:order-2 max-lg:w-full max-lg:flex-col">
          <img
            src="/marketing/person.png"
            alt="Student learning"
            className="max-h-[460px] w-auto object-contain max-lg:hidden"
          />
          <ul className="flex w-full max-w-[200px] flex-col gap-4 max-lg:max-w-none max-lg:flex-row max-lg:flex-wrap max-lg:justify-center max-sm:flex-col">
            {heroHighlights.map((item, index) => {
              const Icon = highlightIcons[index] ?? Layers
              return (
                <li
                  key={item.label}
                  className="home-slide-right flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/20 bg-white/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md transition hover:-translate-y-1 hover:scale-[1.02] hover:border-primary-light max-lg:max-w-[180px] max-lg:min-w-[140px] max-sm:max-w-none"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-[0_4px_12px_rgba(52,184,193,0.3)] max-md:size-8">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xl leading-none font-semibold">{item.value}</span>
                    <span className="mt-1 block text-xs leading-tight text-muted-foreground">
                      {item.label}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
