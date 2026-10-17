import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { homeContainer } from '../content'
import { useHomeDictionary } from '../i18n'

export function CtaSection() {
  const t = useHomeDictionary().cta

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-20 max-md:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        aria-hidden
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)',
        }}
      />
      <div className={cn(homeContainer, 'relative text-center')}>
        <h2 className="mb-4 text-4xl font-semibold text-white max-md:text-3xl">{t.title}</h2>
        <p className="mx-auto mb-8 max-w-xl text-lg text-white/90">{t.body}</p>
        <Link to="/signup" className={buttonVariants({ variant: 'inverse', size: 'lg' })}>
          {t.button}
        </Link>
      </div>
    </section>
  )
}
