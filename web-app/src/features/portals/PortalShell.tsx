import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2, LogOut, Menu, PanelLeftClose, PanelLeftOpen, TriangleAlert } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'
import { useMaintenanceStore } from '@/stores/maintenanceStore'

/** Shared header height so the sidebar brand row lines up with the portal bar. */
const shellBarHeight = 'h-16'

export type PortalNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type PortalShellProps = {
  title: string
  nav: PortalNavItem[]
  profilePath: string
  children?: ReactNode
}

function userLabel(user: AuthUser | null): string {
  const profile = user?.profile
  return (
    profile?.displayName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Account'
  )
}

/** First two letters of the user's name, skipping spaces and separators. */
function userInitials(user: AuthUser | null): string {
  const label = userLabel(user)
  const source = label.includes('@') ? (label.split('@')[0] ?? label) : label
  const letters = [...source].filter((char) => /[\p{L}\p{N}]/u.test(char))
  return letters.slice(0, 2).join('').toUpperCase() || '?'
}

function AccountMenu({
  profilePath,
  loggingOut,
  onLogout,
}: {
  profilePath: string
  loggingOut: boolean
  onLogout: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const name = userLabel(user)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function goHome() {
    setOpen(false)
    navigate('/')
  }

  function goProfile() {
    setOpen(false)
    navigate(profilePath)
  }

  return (
    <div className="relative ml-auto shrink-0" ref={rootRef}>
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground outline-none focus:ring-1 focus:ring-black aria-expanded:ring-1 aria-expanded:ring-black"
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {userInitials(user)}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-sidebar-border bg-sidebar py-1 text-sm text-sidebar-foreground shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left hover:bg-sidebar-accent"
            onClick={goProfile}
          >
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left hover:bg-sidebar-accent"
            onClick={goHome}
          >
            Go to home
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-70"
            aria-busy={loggingOut}
            disabled={loggingOut}
            onClick={onLogout}
          >
            Sign out
            {loggingOut ? (
              <Loader2 className="ml-auto size-4 shrink-0 animate-spin" aria-hidden />
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function SidebarLabel({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'grid transition-[grid-template-columns,opacity] duration-300 ease-in-out motion-reduce:transition-none',
        collapsed
          ? 'md:w-0 md:min-w-0 md:grid-cols-[0fr] md:opacity-0'
          : 'grid-cols-[1fr] opacity-100',
      )}
    >
      <span className="min-w-0 overflow-hidden whitespace-nowrap">{children}</span>
    </span>
  )
}

export function PortalShell({ title, nav, profilePath, children }: PortalShellProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const maintenanceMode = useMaintenanceStore((s) => s.maintenanceMode)
  const showMaintenanceBar = maintenanceMode && user?.role === 'super'

  async function onLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <div
        aria-hidden
        className={cn(
          'hidden shrink-0 transition-[width] duration-300 ease-in-out motion-reduce:transition-none md:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex h-svh w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,translate] duration-300 ease-in-out motion-reduce:transition-none md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'md:w-16',
        )}
      >
        <div
          data-shell-bar="sidebar"
          className={cn(
            shellBarHeight,
            'flex shrink-0 items-center border-b border-sidebar-border bg-sidebar px-3',
            collapsed ? 'md:justify-center md:px-2' : 'justify-between gap-2',
          )}
        >
          <BrandLogo
            variant="wordmark"
            className={cn(
              'h-9 w-auto min-w-0 md:max-w-[calc(100%-2.75rem)]',
              collapsed && 'md:hidden',
            )}
          />
          <button
            type="button"
            className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent md:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        <nav
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3',
            collapsed && 'md:px-2',
          )}
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex h-9 shrink-0 items-center overflow-hidden rounded-lg text-sm',
                  collapsed ? 'md:justify-center md:gap-0 md:px-0' : 'gap-2 px-3',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/70',
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              <SidebarLabel collapsed={collapsed}>{item.label}</SidebarLabel>
            </NavLink>
          ))}
        </nav>
        <div className={cn('shrink-0 border-t border-sidebar-border p-3', collapsed && 'md:px-2')}>
          <div
            className={cn(
              'overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none',
              collapsed ? 'md:mb-0 md:max-h-0 md:opacity-0' : 'mb-2 max-h-16 opacity-100',
            )}
          >
            <p className="truncate px-1 text-xs text-muted-foreground">{user?.email}</p>
            <p className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {user?.role}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              'w-full',
              collapsed ? 'md:justify-center md:gap-0 md:px-0' : 'justify-start',
            )}
            aria-label="Log out"
            aria-busy={loggingOut}
            disabled={loggingOut}
            onClick={() => void onLogout()}
          >
            {loggingOut ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4 shrink-0" />
            )}
            <SidebarLabel collapsed={collapsed}>Log out</SidebarLabel>
          </Button>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-foreground/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header
          className={cn(
            shellBarHeight,
            'sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground',
          )}
        >
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </button>
          <BrandLogo className="size-8 shrink-0 md:hidden" />
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
          <AccountMenu
            profilePath={profilePath}
            loggingOut={loggingOut}
            onLogout={() => void onLogout()}
          />
        </header>
        {showMaintenanceBar ? (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-accent/40 bg-accent/10 px-4 py-2 text-sm"
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            <span>Maintenance mode is on. Only SUPER users can use the platform.</span>
            <Link to="/super/settings" className="font-medium text-primary hover:underline">
              Manage settings
            </Link>
          </div>
        ) : null}
        <main className="flex-1 p-4 md:p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
