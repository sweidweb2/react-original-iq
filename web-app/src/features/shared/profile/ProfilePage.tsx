import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const name =
    user?.profile?.displayName?.trim() ||
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ').trim() ||
    ''

  return (
    <PortalPageShell
      title="Profile"
      description="Update personal information and password. Shared across all portals."
      actions={
        <Button type="button" size="sm" onClick={() => comingSoon('Save profile')}>
          Save changes
        </Button>
      }
      maxWidth="4xl"
    >
      <SectionCard title="Personal information" description="Name, email, and contact details.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Display name</span>
            <Input defaultValue={name} placeholder="Your name" disabled />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email</span>
            <Input defaultValue={user?.email ?? ''} type="email" disabled />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Phone</span>
            <Input placeholder="Phone number" disabled />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Role</span>
            <Input defaultValue={user?.role ?? ''} disabled />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Password" description="Change your account password.">
        <div className="grid max-w-md gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Current password</span>
            <Input type="password" disabled placeholder="••••••••" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">New password</span>
            <Input type="password" disabled placeholder="••••••••" />
          </label>
          <Button type="button" variant="outline" size="sm" className="w-fit" disabled>
            Update password
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone" description="Account deletion follows role rules (client-facing later).">
        <EmptyState
          title="Delete account"
          description="This action will be gated by backend rules."
          action={
            <Button type="button" variant="danger" size="sm" disabled>
              Delete account
            </Button>
          }
        />
      </SectionCard>
    </PortalPageShell>
  )
}
