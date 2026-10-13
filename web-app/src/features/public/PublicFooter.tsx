import { Link } from 'react-router-dom'

import { BrandLogo } from '@/components/brand/BrandLogo'

const serviceLinks = [
  { to: '/services#tutoring', label: 'Tutoring' },
  { to: '/services#assignment', label: 'Assignment Help' },
  { to: '/services#research', label: 'Research' },
]

const companyLinks = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/services', label: 'Our Services' },
  { to: '/faq', label: 'How It Works' },
]

const supportLinks = [
  { to: '/faq', label: 'FAQ' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/refunds', label: 'Refunds Policy' },
  { to: '/contact#support', label: 'Get Support' },
]

const socialLinks = [
  {
    href: 'https://www.instagram.com/original_iq_?igsh=MTF0bGliODdiNm42MQ==',
    label: 'Instagram',
    path: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z',
  },
  {
    href: 'https://www.facebook.com/share/1CpNrw1AWx/?mibextid=wwXIfr',
    label: 'Facebook',
    path: 'M14 8h3V4h-3c-2.2 0-4 1.8-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8c0-.6.4-1 1-1z',
  },
  {
    href: 'https://www.tiktok.com/@original.iq?_r=1&_t=ZS-91UsBiS4OWI',
    label: 'TikTok',
    path: 'M14 3h3.1a5.2 5.2 0 0 0 3.9 3.6v3.1a8.2 8.2 0 0 1-3.8-1v6.7a6.4 6.4 0 1 1-6.4-6.4c.3 0 .7 0 1 .1v3.2a3.2 3.2 0 1 0 2.2 3V3z',
  },
]

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-foreground text-white/80">
      <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-8 py-16 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
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
          <ul className="flex items-center gap-4">
            {socialLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="inline-flex text-white/70 transition hover:-translate-y-0.5 hover:text-white"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d={item.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
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
