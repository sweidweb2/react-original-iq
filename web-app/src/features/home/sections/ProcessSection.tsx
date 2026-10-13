import type { LucideIcon } from 'lucide-react'
import { Check, CreditCard, Repeat, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

import { homeContainer, processStages } from '../content'

const stageIcons: LucideIcon[] = [Users, CreditCard, Repeat]

export function ProcessSection() {
  return (
    <section
      id="process"
      className="relative overflow-hidden bg-gradient-to-br from-background to-card py-24 max-md:py-16"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: [
            'radial-gradient(circle at 20% 20%, rgba(52, 184, 193, 0.08) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 80%, rgba(109, 214, 220, 0.06) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(255, 107, 53, 0.04) 0%, transparent 60%)',
          ].join(', '),
        }}
      />
      <div className={cn(homeContainer, 'relative')}>
        <header className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-semibold tracking-tight max-md:text-3xl">
            Our Process
          </h2>
          <p className="text-lg text-muted-foreground">
            Experience a streamlined journey from inquiry to success with our proven methodology
          </p>
        </header>

        <ol className="mx-auto grid max-w-[1200px] gap-16 lg:grid-cols-3">
          {processStages.map((stage, index) => {
            const Icon = stageIcons[index] ?? Users
            return (
              <li
                key={stage.title}
                className="home-slide-up relative flex flex-col items-center overflow-hidden rounded-3xl border border-primary/10 bg-white/70 px-4 py-8 text-center backdrop-blur-md transition hover:-translate-y-2 hover:scale-[1.02] hover:border-primary-light hover:shadow-[0_20px_40px_rgba(52,184,193,0.15)]"
                style={{ animationDelay: `${index * 200 + 100}ms` }}
              >
                <div className="relative mb-8">
                  <span className="inline-flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white shadow-[0_8px_24px_rgba(52,184,193,0.3)]">
                    <Icon className="size-10" aria-hidden />
                  </span>
                  <span className="absolute -top-2.5 -right-2.5 inline-flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
                    {stage.number}
                  </span>
                  {index < processStages.length - 1 ? (
                    <span
                      className="absolute top-1/2 -right-16 hidden h-0.5 w-16 -translate-y-1/2 bg-gradient-to-r from-primary to-primary-light xl:block"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <h3 className="mb-4 text-2xl font-semibold">{stage.title}</h3>
                <p className="mb-6 text-muted-foreground">{stage.description}</p>
                <ul className="flex w-full flex-col gap-3">
                  {stage.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-left text-sm text-muted-foreground"
                    >
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
