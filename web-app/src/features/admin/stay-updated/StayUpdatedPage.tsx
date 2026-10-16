import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { SearchField } from '@/components/ui/search-field'

import { comingSoon } from '@/features/shared/comingSoon'
import { PortalPageShell, SectionCard } from '@/features/shared/PortalPageShell'

export function StayUpdatedPage() {
  return (
    <PortalPageShell
      title="Stay updated"
      description="Newsletter / stay-updated email list."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => comingSoon('Export emails')}>
          Export
        </Button>
      }
    >
      <SectionCard title="Filters" description="Search subscriber emails.">
        <SearchField
          value=""
          onValueChange={() => undefined}
          placeholder="Search emails…"
          className="max-w-md"
        />
      </SectionCard>

      <SectionCard title="Subscribers" description="Delete and export actions later.">
        <EmptyState title="No subscribers yet" description="Stay-updated signups will appear here." />
      </SectionCard>
    </PortalPageShell>
  )
}
