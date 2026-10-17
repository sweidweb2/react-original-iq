import { BrandLogo } from '@/components/brand/BrandLogo'
import { LocalizedLink } from '@/i18n'
import { cn } from '@/lib/utils'

import { usePublicDictionary } from './i18n'
import { publicContainerClass } from './publicContainer'
import { SocialLinks } from './SocialLinks'

export function PublicFooter() {
  const t = usePublicDictionary().footer

  const serviceLinks = [
    { to: '/services#tutoring', label: t.serviceLinks.tutoring },
    { to: '/services#assignment', label: t.serviceLinks.assignment },
    { to: '/services#research', label: t.serviceLinks.research },
  ]

  const companyLinks = [
    { to: '/about', label: t.companyLinks.about },
    { to: '/contact', label: t.companyLinks.contact },
    { to: '/services', label: t.companyLinks.services },
    { to: '/#how-it-works', label: t.companyLinks.howItWorks },
  ]

  const supportLinks = [
    { to: '/faq', label: t.supportLinks.faq },
    { to: '/terms', label: t.supportLinks.terms },
    { to: '/privacy', label: t.supportLinks.privacy },
    { to: '/refunds', label: t.supportLinks.refunds },
    { to: '/contact#support', label: t.supportLinks.support },
  ]

  return (
    <footer className="mt-auto bg-foreground text-white/80">
      <div
        className={cn(
          publicContainerClass,
          'grid gap-12 py-16 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr_auto]',
        )}
      >
        <div>
          <BrandLogo variant="wordmark" className="h-12 w-auto brightness-0 invert" />
          <p className="mt-4 max-w-sm leading-relaxed text-white/70">{t.tagline}</p>
        </div>
        <FooterColumn title={t.services} links={serviceLinks} />
        <FooterColumn title={t.company} links={companyLinks} />
        <FooterColumn title={t.support} links={supportLinks} />
        <div>
          <p className="mb-4 text-lg font-semibold text-white">{t.followUs}</p>
          <SocialLinks linkClassName="text-white/70 hover:text-white" />
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-8 text-center text-sm text-white/60">
        {t.copyright(new Date().getFullYear())}
      </p>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: Array<{ to: string; label: string }>
}) {
  return (
    <nav aria-label={title}>
      <p className="mb-4 text-lg font-semibold text-white">{title}</p>
      <ul className="flex flex-col gap-3 text-sm">
        {links.map((item) => (
          <li key={item.to}>
            <LocalizedLink
              to={item.to}
              className="text-white/70 transition hover:text-primary-light"
            >
              {item.label}
            </LocalizedLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
