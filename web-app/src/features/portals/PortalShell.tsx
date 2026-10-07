import type { LucideIcon } from 'lucide-react'
import { Home, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/authStore'

export type PortalNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type PortalShellProps = {
  title: string
  brand: string
  nav: PortalNavItem[]
  children?: ReactNode
}

function navIsActive(pathname: string, item: PortalNavItem): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function PortalShell({ title, brand, nav, children }: PortalShellProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Link to="/" className="truncate text-sm font-semibold text-sidebar-foreground">
              {brand}
            </Link>
          </div>
          <p className="px-2 text-xs text-sidebar-foreground/70">{title}</p>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<NavLink to={item.to} end={item.end} />}
                      isActive={navIsActive(location.pathname, item)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="truncate px-2 text-xs text-sidebar-foreground/70">{user?.email}</div>
          <div className="truncate px-2 pb-1 text-[11px] uppercase tracking-wide text-sidebar-foreground/50">
            {user?.role}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mx-2 mb-2 justify-start gap-2"
            onClick={() => void onLogout()}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </header>
        <div className="flex-1 p-4 md:p-6">{children ?? <Outlet />}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const ADMIN_NAV: PortalNavItem[] = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
]

export const COORDINATOR_NAV: PortalNavItem[] = [
  { to: '/coordinator', label: 'Home', icon: Home, end: true },
]

export const TUTOR_NAV: PortalNavItem[] = [
  { to: '/tutor', label: 'Home', icon: Home, end: true },
]

export const CLIENT_NAV: PortalNavItem[] = [
  { to: '/client', label: 'Home', icon: Home, end: true },
]
