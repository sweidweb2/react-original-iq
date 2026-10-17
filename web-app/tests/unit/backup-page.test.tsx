import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PORTALS } from '@/features/portals/portalNav'
import { ExportFormatMenu } from '@/features/super/backup/ExportFormatMenu'

describe('backup navigation', () => {
  it('shows the Backup link in the super portal only', () => {
    for (const portal of PORTALS) {
      const hasBackup = portal.nav.some((item) => item.to.endsWith('/backup'))
      expect(hasBackup).toBe(portal.role === 'super')
    }
    const superNav = PORTALS.find((portal) => portal.role === 'super')?.nav ?? []
    expect(superNav.find((item) => item.label === 'Backup')?.to).toBe('/super/backup')
  })
})

describe('ExportFormatMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens a format list on click and exports the chosen format', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ExportFormatMenu label="Export users" onSelect={onSelect} />)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Export users/ }))

    const items = screen.getAllByRole('menuitem').map((item) => item.textContent)
    expect(items).toEqual(['CSV', 'JSON', 'Excel (XLSX)', 'SQL inserts'])

    await user.click(screen.getByRole('menuitem', { name: 'Excel (XLSX)' }))
    expect(onSelect).toHaveBeenCalledWith('xlsx')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Escape without exporting', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ExportFormatMenu onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /Export/ }))
    expect(screen.getByRole('menu')).toBeVisible()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('is disabled while exporting', () => {
    render(<ExportFormatMenu busy onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Exporting/ })).toBeDisabled()
  })
})
