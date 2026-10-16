import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/ui/star-rating'

import { comingSoon } from '../comingSoon'
import { PortalPageShell, SectionCard } from '../PortalPageShell'

export function FeedbackPage() {
  return (
    <PortalPageShell
      title="Feedback"
      description="View or submit ratings and comments. Shared shell — role actions later."
      actions={
        <Button type="button" size="sm" onClick={() => comingSoon('Submit feedback')}>
          Submit feedback
        </Button>
      }
    >
      <SectionCard title="Submit" description="Client-facing rating form shell.">
        <div className="grid max-w-lg gap-4">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Rating</span>
            <StarRating value={0} readOnly />
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Comments</span>
            <Textarea placeholder="Share your experience…" disabled rows={4} />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Feedback list" description="Admin/tutor reviews and history.">
        <EmptyState title="No feedback yet" description="Entries will list here once feedback APIs are connected." />
      </SectionCard>
    </PortalPageShell>
  )
}
