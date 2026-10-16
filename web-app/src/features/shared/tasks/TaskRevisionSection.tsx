import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { revisionStatusLabel, type RevisionSession } from '@/services/revisions'

import { SectionCard } from '../PortalPageShell'
import { formatTaskDate } from './taskDetailsFormat'

export function TaskRevisionSection({
  taskId,
  tasksBase,
  revisions,
  canManageRevisions,
}: {
  taskId: string
  tasksBase: string
  revisions: RevisionSession[]
  canManageRevisions: boolean
}) {
  return (
    <SectionCard
      title="Revision"
      description="Revision sessions for this task."
      actions={
        canManageRevisions && revisions[0] ? (
          <Link
            to={`${tasksBase}/${taskId}/revisions/${revisions[0].id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Latest revision
          </Link>
        ) : undefined
      }
    >
      {revisions.length === 0 ? (
        <EmptyState title="No revisions" description="Coordinators can open a revision session." />
      ) : (
        <ul className="space-y-2 text-sm">
          {revisions.map((revision) => (
            <li key={revision.id} className="flex items-center justify-between rounded-md border p-2">
              <div>
                <p className="font-medium">{revision.title ?? 'Revision session'}</p>
                <p className="text-xs text-muted-foreground">
                  {revisionStatusLabel(revision.status)} · {formatTaskDate(revision.createdAt)}
                </p>
              </div>
              <Link
                to={`${tasksBase}/${taskId}/revisions/${revision.id}`}
                className="text-sm font-medium text-primary hover:underline"
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
