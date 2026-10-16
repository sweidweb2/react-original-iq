import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { SearchField } from '@/components/ui/search-field'

import { comingSoon } from '@/features/shared/comingSoon'
import { PortalPageShell, SectionCard } from '@/features/shared/PortalPageShell'

export function ContactMessagesPage() {
  return (
    <PortalPageShell
      title="Contact messages"
      description="Messages from the public contact form."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => comingSoon('Export messages')}>
          Export
        </Button>
      }
    >
      <SectionCard title="Filters" description="Search contact messages.">
        <SearchField
          value=""
          onValueChange={() => undefined}
          placeholder="Search messages…"
          className="max-w-md"
        />
      </SectionCard>

      <SectionCard title="Messages" description="View and delete messages later.">
        <EmptyState title="No messages yet" description="Contact form submissions will list here." />
      </SectionCard>
    </PortalPageShell>
  )
}
