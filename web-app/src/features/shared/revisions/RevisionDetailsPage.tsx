import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function RevisionDetailsPage() {
  const { taskId = '—', revisionId = '—' } = useParams()
  const { pathname } = useLocation()
  const [editOpen, setEditOpen] = useState(false)

  const taskPath = pathname.replace(/\/revisions\/[^/]+\/?$/, '')

  return (
    <PortalPageShell
      title="Revision details"
      description={`Revision ${revisionId} on task ${taskId}.`}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit revision
          </Button>
          <Button type="button" size="sm" onClick={() => comingSoon('Approve revision')}>
            Approve
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        <Link to={taskPath} className="font-medium text-primary hover:underline">
          Back to task
        </Link>
      </p>

      <SectionCard title="Session" description="Revision window, status, and notes.">
        <EmptyState title="No session data" description="Session fields will load here later." />
      </SectionCard>

      <SectionCard title="Revision solutions" description="Upload, download, and review revision files.">
        <EmptyState title="No revision solutions" description="File actions will appear here." />
      </SectionCard>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit revision"
        description="Update revision session details."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled>
              Save
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Revision edit shell — UI only.</p>
      </Dialog>
    </PortalPageShell>
  )
}
