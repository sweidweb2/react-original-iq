import { GraduationCap } from 'lucide-react'

import { Can } from '@/components/auth'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/authStore'

export function HomePage() {
  useDocumentTitle('Home')
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isStaff } = usePermissions()

  if (!user) {
    return null
  }

  const name =
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.email

  return (
    <div className="min-h-svh bg-background">
      <Header>
        <div className="flex w-full items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-foreground">Original IQ</h1>
          <div className="flex items-center gap-2">
            <Can roles={['SUPER', 'ADMIN']}>
              <span className="text-xs text-muted-foreground">Admin tools</span>
            </Can>
            <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </div>
      </Header>

      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <GraduationCap className="size-8 text-foreground" aria-hidden />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome, {name}</h2>
        <p className="text-muted-foreground">
          You are signed in as <span className="font-medium text-foreground">{user.role}</span>
          {isStaff ? ' (staff)' : ''}. This is your home base for Original IQ tutoring.
        </p>
      </main>
    </div>
  )
}
