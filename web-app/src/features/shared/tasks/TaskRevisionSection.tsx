import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { type RevisionSession, revisionStatusLabel } from '@/services/revisions'

import { SectionCard } from '../PortalPageShell'
import { formatTaskDate, revisionStatusTone } from './taskDetailsFormat'

export function TaskRevisionSection({
  taskId,
  tasksBase,
  revisions,
  canCreateRevisions,
  onCreateRevision,
}: {
  taskId: string
  tasksBase: string
  revisions: RevisionSession[]
  canCreateRevisions: boolean
  onCreateRevision: () => void
}) {
  return (
    <SectionCard
      title="Revision"
      description="Revision sessions for this task."
      actions={
        canCreateRevisions ? (
          <Button type="button" size="sm" onClick={onCreateRevision}>
            <Plus className="size-4" aria-hidden />
            Create revision
          </Button>
        ) : undefined
      }
    >
      {revisions.length === 0 ? (
        <EmptyState title="No revisions" description="Coordinators can open a revision session." />
      ) : (
        <ul className="space-y-2">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {revision.title ?? 'Revision session'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={revisionStatusTone(revision.status)}>
                    {revisionStatusLabel(revision.status)}
                  </Badge>
                  <span>{formatTaskDate(revision.createdAt)}</span>
                </div>
              </div>
              <Link
                to={`${tasksBase}/${taskId}/revisions/${revision.id}`}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
