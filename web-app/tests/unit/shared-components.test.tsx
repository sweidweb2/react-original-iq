import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { EmptyState } from '@/components/feedback'
import { PageHeader, Sidebar } from '@/components/layout'
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardTitle,
  Dialog,
  SearchField,
  Sheet,
  StarRating,
  Textarea,
  Tooltip,
} from '@/components/ui'

afterEach(() => {
  cleanup()
})

describe('shared components', () => {
  it('renders the display and form pieces', () => {
    render(
      <div>
        <Textarea aria-label="Notes" defaultValue="Hello" />
        <Card>
          <CardTitle>Task</CardTitle>
        </Card>
        <Badge tone="success">Settled</Badge>
        <Avatar name="Sara Nabil" />
        <Alert tone="info" title="Saved" />
        <EmptyState title="No tasks yet" />
        <PageHeader title="Tasks" description="Assigned work" />
        <StarRating value={4} readOnly />
      </div>,
    )

    expect(screen.getByLabelText('Notes')).toHaveValue('Hello')
    expect(screen.getByRole('heading', { name: 'Task' })).toBeInTheDocument()
    expect(screen.getByText('Settled')).toBeInTheDocument()
    expect(screen.getByText('Sara Nabil')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Rating: 4 out of 5' })).toBeInTheDocument()
  })

  it('updates search and rating', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [query, setQuery] = useState('math')
      const [rating, setRating] = useState(2)

      return (
        <div>
          <SearchField value={query} onValueChange={setQuery} />
          <StarRating value={rating} onChange={setRating} />
        </div>
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')

    await user.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()
  })

  it('opens dialog, tooltip, sheet, and sidebar', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [dialogOpen, setDialogOpen] = useState(false)
      const [sheetOpen, setSheetOpen] = useState(false)

      return (
        <div>
          <button type="button" onClick={() => setDialogOpen(true)}>
            Open dialog
          </button>
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Edit task">
            Details
          </Dialog>
          <Tooltip content="Due tomorrow">
            <button type="button">Due</button>
          </Tooltip>
          <button type="button" onClick={() => setSheetOpen(true)}>
            Open sheet
          </button>
          <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
            Filter list
          </Sheet>
          <MemoryRouter>
            <Sidebar items={[{ to: '/tutor', label: 'Home', icon: Home, end: true }]} />
          </MemoryRouter>
        </div>
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: 'Due' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Due tomorrow')

    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    expect(screen.getByRole('dialog', { name: 'Filters' })).toHaveTextContent('Filter list')

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/tutor')
  })
})
