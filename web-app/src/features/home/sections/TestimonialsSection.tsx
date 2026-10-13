import { Avatar } from '@/components/ui/avatar'
import { StarRating } from '@/components/ui/star-rating'
import { cn } from '@/lib/utils'

import { homeContainer, testimonials } from '../content'

export function TestimonialsSection() {
  const loop = [...testimonials, ...testimonials]

  return (
    <section id="testimonials" className="bg-card py-20">
      <div className={homeContainer}>
        <header className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-semibold tracking-tight max-md:text-3xl">
            What Students Say
          </h2>
          <p className="mx-auto max-w-4xl text-lg text-muted-foreground">
            Discover how our personalized tutoring approach has transformed academic success for
            students across the Gulf region. From struggling with complex concepts to achieving top
            grades, hear directly from learners who&apos;ve experienced the Original IQ difference.
          </p>
        </header>

        <div className="home-marquee-wrap overflow-hidden">
          <div className="home-marquee flex w-max gap-6">
            {loop.map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                aria-hidden={index >= testimonials.length ? true : undefined}
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
                <StarRating value={item.rating} readOnly label={`${item.name} rating`} />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.quote}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
