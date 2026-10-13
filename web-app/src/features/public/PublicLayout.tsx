import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { buttonVariants } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { homePathForRole } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { zIndex } from '@/theme'

import { PublicFooter } from './PublicFooter'
import { PUBLIC_NAV } from './publicNav'

function pageLinkClass(isActive: boolean) {
  return cn(
    'rounded-md px-3 py-2 text-sm',
    isActive ? 'bg-primary/10 font-medium text-primary-dark' : 'text-foreground hover:bg-muted',
  )
}

function PageLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {PUBLIC_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={'end' in item ? item.end : undefined}
          onClick={onNavigate}
          className={({ isActive }) => pageLinkClass(isActive)}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user)

  if (user) {
    return (
      <Link
        to={homePathForRole(user.role)}
        onClick={onNavigate}
        className={buttonVariants({ size: 'sm' })}
      >
        Portal
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
        Login
      </NavLink>
      <NavLink to="/signup" onClick={onNavigate} className={buttonVariants({ size: 'sm' })}>
        Sign up
      </NavLink>
    </>
  )
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header
        className="sticky top-0 border-b border-border bg-card"
        style={{ zIndex: zIndex.sticky }}
      >
        <div className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 lg:px-14">
          <Link to="/" className="justify-self-start" onClick={closeMenu}>
            <BrandLogo variant="wordmark" className="h-9 w-auto" />
          </Link>

          <nav aria-label="Public" className="col-start-2 hidden items-center gap-1 md:flex">
            <PageLinks />
          </nav>

          <div className="col-start-3 hidden items-center justify-self-end gap-2 md:flex">
            <AccountLinks />
          </div>

          <button
            type="button"
            className="col-start-3 inline-flex size-9 items-center justify-center justify-self-end rounded-md border border-border md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      <Sheet open={menuOpen} onClose={closeMenu} title="Menu" side="right">
        <nav aria-label="Public mobile" className="flex flex-col gap-1">
          <PageLinks onNavigate={closeMenu} />
          <div className="mt-4 flex flex-col gap-2">
            <AccountLinks onNavigate={closeMenu} />
          </div>
        </nav>
      </Sheet>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
