import { type ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { buttonVariants } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { LocalizedLink, LocalizedNavLink, useI18n } from '@/i18n'
import { homePathForRole } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { zIndex } from '@/theme'

import { usePublicDictionary } from './i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import { publicContainerClass } from './publicContainer'
import { PublicFooter } from './PublicFooter'
import { PUBLIC_NAV } from './publicNav'

function pageLinkClass(isActive: boolean) {
  return cn(
    'rounded-md px-3 py-2 text-sm',
    isActive ? 'bg-primary/10 font-medium text-primary-dark' : 'text-foreground hover:bg-muted',
  )
}

function PageLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = usePublicDictionary()

  return (
    <>
      {PUBLIC_NAV.map((item) => (
        <LocalizedNavLink
          key={item.to}
          to={item.to}
          end={'end' in item ? item.end : undefined}
          onClick={onNavigate}
          className={({ isActive }) => pageLinkClass(isActive)}
        >
          {t.layout.nav[item.key]}
        </LocalizedNavLink>
      ))}
    </>
  )
}

function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user)
  const t = usePublicDictionary()

  if (user) {
    return (
      <Link
        to={homePathForRole(user.role)}
        onClick={onNavigate}
        className={buttonVariants({ size: 'sm' })}
      >
        {t.layout.portal}
      </Link>
    )
  }

  return (
    <>
      <NavLink
        to="/login"
        onClick={onNavigate}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        {t.layout.login}
      </NavLink>
      <NavLink to="/signup" onClick={onNavigate} className={buttonVariants({ size: 'sm' })}>
        {t.layout.signup}
      </NavLink>
    </>
  )
}

export function PublicLayout({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { localized } = useI18n()
  const t = usePublicDictionary()

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header
        className="sticky top-0 border-b border-border bg-card"
        style={{ zIndex: zIndex.sticky }}
      >
        <div
          className={cn(publicContainerClass, 'grid h-16 grid-cols-[1fr_auto_1fr] items-center')}
        >
          <LocalizedLink to="/" className="justify-self-start" onClick={closeMenu}>
            <BrandLogo variant="wordmark" className="h-9 w-auto" />
          </LocalizedLink>

          <nav
            aria-label={t.layout.navLabel}
            className="col-start-2 hidden items-center gap-1 md:flex"
          >
            <PageLinks />
          </nav>

          <div className="col-start-3 hidden items-center justify-self-end gap-2 md:flex">
            {localized ? <LanguageSwitcher /> : null}
            <AccountLinks />
          </div>

          <button
            type="button"
            className="col-start-3 inline-flex size-9 items-center justify-center justify-self-end rounded-md border border-border md:hidden"
            aria-label={t.layout.openMenu}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      <Sheet
        open={menuOpen}
        onClose={closeMenu}
        title={t.layout.menu}
        side="end"
        footer={
          <LocalizedLink to="/" onClick={closeMenu} className="flex justify-center">
            <BrandLogo variant="wordmark" className="h-9 w-auto" />
          </LocalizedLink>
        }
      >
        <nav aria-label={t.layout.mobileNavLabel} className="flex flex-col gap-1">
          <PageLinks onNavigate={closeMenu} />
          <div className="mt-4 flex flex-col gap-2">
            <AccountLinks onNavigate={closeMenu} />
          </div>
          {localized ? <LanguageSwitcher className="mt-4 w-full" onNavigate={closeMenu} /> : null}
        </nav>
      </Sheet>

      <main className="flex flex-1 flex-col">{children ?? <Outlet />}</main>
      <PublicFooter />
    </div>
  )
}
