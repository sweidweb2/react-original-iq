import { Avatar } from '@/components/ui/avatar'
import { StarRating } from '@/components/ui/star-rating'
import { cn } from '@/lib/utils'

import { homeContainer } from '../content'
import { useHomeDictionary } from '../i18n'

export function TestimonialsSection() {
  const t = useHomeDictionary().testimonials
  const loop = [...t.items, ...t.items]

  return (
    <section id="testimonials" className="bg-card py-20">
      <div className={homeContainer}>
        <header className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-semibold tracking-tight max-md:text-3xl">{t.title}</h2>
          <p className="mx-auto max-w-4xl text-lg text-muted-foreground">{t.intro}</p>
        </header>

        <div className="home-marquee-wrap overflow-hidden">
          <div className="home-marquee flex w-max gap-6">
            {loop.map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                aria-hidden={index >= t.items.length ? true : undefined}
                className={cn(
                  'w-[340px] shrink-0 rounded-lg border border-border bg-background p-5 shadow-sm max-lg:w-[300px] max-md:w-[280px]',
                )}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Avatar name={item.name} size="sm" />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.meta}</p>
                  </div>
                </div>
                <StarRating value={item.rating} readOnly label={t.ratingLabel(item.name)} />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.quote}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
