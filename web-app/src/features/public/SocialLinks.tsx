import { cn } from '@/lib/utils'

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
] as const

type SocialLinksProps = {
  className?: string
  linkClassName?: string
}

export function SocialLinks({ className, linkClassName }: SocialLinksProps) {
  return (
    <ul className={cn('flex items-center gap-4', className)}>
      {socialLinks.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            className={cn('inline-flex transition hover:-translate-y-0.5', linkClassName)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={item.path} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
