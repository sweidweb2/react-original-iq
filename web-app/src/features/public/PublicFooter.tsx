import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { cn } from '@/lib/utils'

import { publicContainerClass } from './publicContainer'
import { SocialLinks } from './SocialLinks'

const serviceLinks = [
  { to: '/services#tutoring', label: 'Tutoring' },
  { to: '/services#assignment', label: 'Assignment Help' },
  { to: '/services#research', label: 'Research' },
]

const companyLinks = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/services', label: 'Our Services' },
  { to: '/#how-it-works', label: 'How It Works' },
]

const supportLinks = [
  { to: '/faq', label: 'FAQ' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/refunds', label: 'Refunds Policy' },
  { to: '/contact#support', label: 'Get Support' },
]

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-foreground text-white/80">
      <div className={cn(publicContainerClass, 'grid gap-12 py-16 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr_auto]')}>
        <div>
          <BrandLogo variant="wordmark" className="h-12 w-auto brightness-0 invert" />
          <p className="mt-4 max-w-sm leading-relaxed text-white/70">
            Empowering students to reach their full potential through personalized, expert tutoring.
          </p>
        </div>
        <FooterColumn title="Services" links={serviceLinks} />
        <FooterColumn title="Company" links={companyLinks} />
        <FooterColumn title="Support" links={supportLinks} />
        <div>
          <p className="mb-4 text-lg font-semibold text-white">Follow Us</p>
          <SocialLinks linkClassName="text-white/70 hover:text-white" />
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-8 text-center text-sm text-white/60">
        © {new Date().getFullYear()} Original IQ. All rights reserved.
      </p>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <nav aria-label={title}>
      <p className="mb-4 text-lg font-semibold text-white">{title}</p>
      <ul className="flex flex-col gap-3 text-sm">
        {links.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="text-white/70 transition hover:text-primary-light">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
