import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { type PortalCrumb, usePortalBreadcrumbs } from '@/features/portals/usePortalBreadcrumbs'

function PortalCrumbs({ trail }: { trail: PortalCrumb[] }) {
  return <Breadcrumbs items={usePortalBreadcrumbs(trail)} />
}

function renderAt(path: string, trail: PortalCrumb[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<PortalCrumbs trail={trail} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('breadcrumbs', () => {
  afterEach(cleanup)

  it('links ancestors and marks the last item as the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs
          items={[{ label: 'Home', to: '/' }, { label: 'Tasks', to: '/tasks' }, { label: 'Essay' }]}
        />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/tasks')
    expect(within(nav).queryByRole('link', { name: 'Essay' })).toBeNull()
    expect(within(nav).getByText('Essay')).toHaveAttribute('aria-current', 'page')
  })

  it('renders nothing for an empty trail', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={[]} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
  })

  it('prepends the portal home and resolves paths against the portal root', () => {
    renderAt('/coordinator/tasks/t1/payments', [
      { label: 'Tasks', path: 'tasks' },
      { label: 'Essay', path: 'tasks/t1?tab=payments' },
      { label: 'Payments' },
    ])

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/coordinator')
    expect(within(nav).getByRole('link', { name: 'Tasks' })).toHaveAttribute(
      'href',
      '/coordinator/tasks',
    )
    expect(within(nav).getByRole('link', { name: 'Essay' })).toHaveAttribute(
      'href',
      '/coordinator/tasks/t1?tab=payments',
    )
    expect(within(nav).getByText('Payments')).toHaveAttribute('aria-current', 'page')
  })

  it('uses the portal home nav label', () => {
    renderAt('/super/rbac', [{ label: 'RBAC' }])
    expect(screen.getByRole('link', { name: 'Activity log' })).toHaveAttribute('href', '/super')
  })
})
