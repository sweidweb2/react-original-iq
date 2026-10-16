import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function TaskDetailsPage() {
  const { taskId = '—' } = useParams()
  const { pathname } = useLocation()
  const [priceOpen, setPriceOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)

  const tasksBase = pathname.replace(/\/[^/]+\/?$/, '')
  const portalBase = tasksBase.replace(/\/tasks\/?$/, '')
  const canManageUsers = portalBase.includes('/admin') || portalBase.includes('/coordinator')
  const canViewPayments =
    portalBase.includes('/admin') ||
    portalBase.includes('/coordinator') ||
    portalBase.includes('/client')
  const canViewRevisions = portalBase.includes('/admin') || portalBase.includes('/coordinator')

  return (
    <PortalPageShell
      title="Task details"
      description={`Task ${taskId} — shared shell for all roles; actions will follow RBAC.`}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setPriceOpen(true)}>
            Edit price
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRevisionOpen(true)}>
            Create revision
          </Button>
          <Button type="button" size="sm" onClick={() => comingSoon('Task status update')}>
            Update status
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Pending</Badge>
        <span className="text-sm text-muted-foreground">Status banner placeholder</span>
      </div>

      <SectionCard title="Task information" description="Topic, type, category, deadline, and description.">
        <EmptyState title="No task data loaded" description="Fields will appear here once the API is wired." />
      </SectionCard>

      <SectionCard title="Team" description="Client, tutor, and coordinator assignment.">
        <EmptyState
          title="No team members yet"
          description="Assign tutor / change coordinator will live here."
          action={
            canManageUsers ? (
              <Link
                to={`${portalBase}/users/example`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Preview manage user
              </Link>
            ) : undefined
          }
        />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Documents" description="Download and upload task files.">
          <EmptyState title="No documents" description="Upload / download loaders will appear here." />
        </SectionCard>
        <SectionCard title="Solutions" description="Submitted work and downloads.">
          <EmptyState title="No solutions" description="Submit / cancel delivery actions will appear here." />
        </SectionCard>
      </div>

      <SectionCard
        title="Revision"
        description="Revision sessions for this task."
        actions={
          canViewRevisions ? (
            <Link
              to={`${tasksBase}/${taskId}/revisions/example`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Preview revision
            </Link>
          ) : undefined
        }
      >
        <EmptyState title="No revisions" description="Create, approve, or reject revisions later." />
      </SectionCard>

      <SectionCard
        title="Payments"
        description="Open payment history and remaining balance."
        actions={
          canViewPayments ? (
            <Link
              to={`${tasksBase}/${taskId}/payments`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View payments
            </Link>
          ) : undefined
        }
      >
        <EmptyState title="No payment summary" description="Gateway and refund actions will land on the payments page." />
      </SectionCard>

      <Dialog
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        title="Edit price"
        description="Set or update the task price. Logic comes later."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPriceOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled>
              Save
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Price form shell — UI only.</p>
      </Dialog>

      <Dialog
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        title="Create revision"
        description="Open a revision session for this task."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setRevisionOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled>
              Create
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Revision form shell — UI only.</p>
      </Dialog>
    </PortalPageShell>
  )
}
