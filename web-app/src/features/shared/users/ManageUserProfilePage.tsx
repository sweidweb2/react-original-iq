import { Link, useLocation, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function ManageUserProfilePage() {
  const { userId = '—' } = useParams()
  const { pathname } = useLocation()
  const portalBase = pathname.replace(/\/users\/[^/]+\/?$/, '')
  const backTo = portalBase.endsWith('/admin') ? `${portalBase}/users` : portalBase
  const backLabel = portalBase.endsWith('/admin') ? 'Back to users' : 'Back to home'

  return (
    <PortalPageShell
      title="Manage user"
      description={`Profile management for user ${userId}. Shared by admin and coordinator.`}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => comingSoon('Deactivate user')}>
            Deactivate
          </Button>
          <Button type="button" size="sm" onClick={() => comingSoon('Save user')}>
            Save
          </Button>
        </>
      }
      maxWidth="4xl"
    >
      <p className="text-sm text-muted-foreground">
        <Link to={backTo} className="font-medium text-primary hover:underline">
          {backLabel}
        </Link>
      </p>

      <SectionCard title="User details" description="Role-specific fields will appear here.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <Input disabled placeholder="Full name" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email</span>
            <Input disabled placeholder="email@example.com" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Role</span>
            <Input disabled placeholder="Role" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Status</span>
            <Input disabled placeholder="Active" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Related tasks" description="Tasks linked to this user.">
        <EmptyState
          title="No related tasks"
          description="Open or delete related tasks from here later."
          action={
            <Link
              to={`${portalBase}/tasks/example`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Preview task
            </Link>
          }
        />
      </SectionCard>

      <SectionCard title="Danger zone" description="Safe delete when rules permit.">
        <Button type="button" variant="danger" size="sm" disabled>
          Delete user
        </Button>
      </SectionCard>
    </PortalPageShell>
  )
}
