import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmptyState } from '@/components/feedback'
import { PageHeader, Sidebar } from '@/components/layout'
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  DatePicker,
  Dialog,
  DropdownMenu,
  FileUpload,
  Pagination,
  RadioGroup,
  SearchField,
  Select,
  Sheet,
  Skeleton,
  StarRating,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
        <Select
          aria-label="Status"
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
        <Checkbox label="Active" />
        <RadioGroup
          name="kind"
          value="tutoring"
          onChange={() => undefined}
          options={[{ value: 'tutoring', label: 'Tutoring' }]}
        />
        <DatePicker aria-label="Due date" />
        <Card>
          <CardTitle>Task</CardTitle>
        </Card>
        <Badge tone="success">Settled</Badge>
        <Avatar name="Sara Nabil" />
        <Alert tone="info" title="Saved" />
        <Skeleton className="h-4 w-16" />
        <EmptyState title="No tasks yet" />
        <PageHeader title="Tasks" description="Assigned work" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Essay</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <StarRating value={4} readOnly />
      </div>,
    )

    expect(screen.getByLabelText('Notes')).toHaveValue('Hello')
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
    expect(screen.getByLabelText('Active')).toBeInTheDocument()
    expect(screen.getByLabelText('Tutoring')).toBeChecked()
    expect(screen.getByLabelText('Due date')).toHaveAttribute('type', 'date')
    expect(screen.getByRole('heading', { name: 'Task' })).toBeInTheDocument()
    expect(screen.getByText('Settled')).toBeInTheDocument()
    expect(screen.getByText('Sara Nabil')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Essay' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Rating: 4 out of 5' })).toBeInTheDocument()
  })

  it('updates search, switch, rating, pagination, and file upload', async () => {
    const user = userEvent.setup()
    const onFiles = vi.fn()

    function Harness() {
      const [query, setQuery] = useState('math')
      const [enabled, setEnabled] = useState(false)
      const [rating, setRating] = useState(2)
      const [page, setPage] = useState(1)

      return (
        <div>
          <SearchField value={query} onValueChange={setQuery} />
          <Switch label="Email alerts" checked={enabled} onCheckedChange={setEnabled} />
          <StarRating value={rating} onChange={setRating} />
          <Pagination page={page} pageCount={3} onPageChange={setPage} />
          <FileUpload label="Solution file" onFiles={onFiles} />
        </div>
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')

    await user.click(screen.getByRole('switch', { name: 'Email alerts' }))
    expect(screen.getByRole('switch', { name: 'Email alerts' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')

    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' })
    await user.upload(screen.getByLabelText('Solution file'), file)
    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('opens dialog, confirm, dropdown, tooltip, sheet, and sidebar', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onSelect = vi.fn()

    function Harness() {
      const [dialogOpen, setDialogOpen] = useState(false)
      const [confirmOpen, setConfirmOpen] = useState(false)
      const [sheetOpen, setSheetOpen] = useState(false)

      return (
        <div>
          <button type="button" onClick={() => setDialogOpen(true)}>
            Open dialog
          </button>
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Edit task">
            Details
          </Dialog>
          <button type="button" onClick={() => setConfirmOpen(true)}>
            Open confirm
          </button>
          <ConfirmDialog
            open={confirmOpen}
            title="Cancel task"
            confirmLabel="Cancel task"
            tone="danger"
            onConfirm={onConfirm}
            onClose={() => setConfirmOpen(false)}
          />
          <DropdownMenu
            triggerLabel="Row actions"
            label="Actions"
            items={[{ id: 'archive', label: 'Archive', onSelect }]}
          />
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

    await user.click(screen.getByRole('button', { name: 'Open confirm' }))
    await user.click(screen.getByRole('button', { name: 'Cancel task' }))
    expect(onConfirm).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Row actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }))
    expect(onSelect).toHaveBeenCalledOnce()

    await user.hover(screen.getByRole('button', { name: 'Due' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Due tomorrow')

    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    expect(screen.getByRole('dialog', { name: 'Filters' })).toHaveTextContent('Filter list')

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/tutor')
  })
})
