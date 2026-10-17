import { cn } from '@/lib/utils'

import { homeContainer } from '../content'
import { useHomeDictionary } from '../i18n'

export function HowItWorksSection() {
  const t = useHomeDictionary().howItWorks

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-gradient-to-b from-background to-card py-8 pb-20"
    >
      <div
        className="home-float pointer-events-none absolute top-[10%] start-[5%] size-20 rounded-[20px] bg-gradient-to-br from-primary/15 to-primary-light/10"
        aria-hidden
      />
      <div
        className="home-pulse pointer-events-none absolute end-[8%] bottom-[15%] size-16 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.2),transparent)]"
        aria-hidden
      />

      <div className={cn(homeContainer, 'relative')}>
        <header className="mb-16 text-center">
          <h2 className="text-4xl font-semibold tracking-tight max-md:text-3xl">{t.title}</h2>
        </header>

        <ol className="mx-auto flex max-w-[1200px] items-start justify-between gap-4 max-lg:max-w-xl max-lg:flex-col max-lg:items-center max-lg:gap-8">
          {t.steps.map((step, index) => (
            <li key={step.title} className="relative min-w-0 flex-1 text-center max-lg:max-w-xs">
              {index < t.steps.length - 1 ? (
                <span
                  className="absolute top-10 start-[calc(50%+2.5rem)] hidden h-[3px] w-[calc(100%-2.5rem)] from-primary to-primary-light ltr:bg-gradient-to-r rtl:bg-gradient-to-l lg:block"
                  aria-hidden
                />
              ) : null}
              <div className="relative mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-3xl font-semibold text-white shadow-[0_8px_24px_rgba(52,184,193,0.3)] max-md:size-16 max-md:text-2xl">
                {index + 1}
              </div>
              <h3 className="mb-3 text-xl font-semibold max-md:text-lg">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
