import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { SearchField } from '@/components/ui/search-field'

import { comingSoon } from '@/features/shared/comingSoon'
import { PortalPageShell, SectionCard } from '@/features/shared/PortalPageShell'

export function LeadsPage() {
  return (
    <PortalPageShell
      title="Leads"
      description="Lead capture inbox — search, delete, and export later."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => comingSoon('Export leads')}>
          Export
        </Button>
      }
    >
      <SectionCard title="Filters" description="Search and narrow leads.">
        <SearchField
          value=""
          onValueChange={() => undefined}
          placeholder="Search leads…"
          className="max-w-md"
        />
      </SectionCard>

      <SectionCard title="Leads table" description="Stats and rows will load here.">
        <EmptyState title="No leads yet" description="Home lead modal submissions will appear in this table." />
      </SectionCard>
    </PortalPageShell>
  )
}
