import { Link, useLocation } from 'react-router-dom'

import { LOCALE_LABELS, LOCALES, switchLocalePath, useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

import { usePublicDictionary } from './i18n'

export function LanguageSwitcher({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const { locale } = useI18n()
  const t = usePublicDictionary()
  const { pathname, search, hash } = useLocation()

  return (
    <div
      role="group"
      aria-label={t.layout.languageLabel}
      // Fixed LTR so English stays first and the control does not flip with the page
      dir="ltr"
      className={cn(
        'inline-grid h-8 grid-cols-2 rounded-md border border-border bg-card p-0.5',
        className,
      )}
    >
      {LOCALES.map((target) => {
        const active = target === locale
        return (
          <Link
            key={target}
            to={switchLocalePath(target, pathname, search, hash)}
            lang={target}
            hrefLang={target}
            aria-current={active ? 'true' : undefined}
            onClick={onNavigate}
            className={cn(
              // Concentric with the holder: rounded-md (12px) minus 1px border and 2px padding
              'inline-flex min-w-16 items-center justify-center rounded-[9px] px-3 text-sm leading-none font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {LOCALE_LABELS[target]}
          </Link>
        )
      })}
    </div>
  )
}
