import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'
import { formatTaskDate } from './taskDetailsFormat'

export function TaskInfoSection({ task }: { task: TaskDetail }) {
  return (
    <SectionCard title="Task information" description="Description and metadata.">
      <p className="whitespace-pre-wrap text-sm text-foreground">{task.description ?? '—'}</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Client</dt>
          <dd className="font-mono text-xs">{task.clientId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tutor</dt>
          <dd className="font-mono text-xs">{task.tutorId ?? 'Unassigned'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Coordinator</dt>
          <dd className="font-mono text-xs">{task.coordinatorId ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatTaskDate(task.createdAt)}</dd>
        </div>
      </dl>
    </SectionCard>
  )
}
