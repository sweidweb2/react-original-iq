import { Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function TasksPage() {
  const { pathname } = useLocation()
  const base = pathname.replace(/\/tasks\/?$/, '') || pathname

  return (
    <PortalPageShell
      title="Tasks"
      description="Browse and open tasks for this portal. Filters and data wiring come later."
      actions={
        <Button type="button" size="sm" onClick={() => comingSoon('Create task')}>
          <Plus className="size-4" />
          New task
        </Button>
      }
    >
      <SectionCard title="Task list" description="Status, topic, deadline, and assignment will appear here.">
        <EmptyState
          title="No tasks yet"
          description="When tasks exist, open one to view details, files, and payments."
          action={
            <Link
              to={`${base}/tasks/example`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Preview task details
            </Link>
          }
        />
      </SectionCard>
    </PortalPageShell>
  )
}
