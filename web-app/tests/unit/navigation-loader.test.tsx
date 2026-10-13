import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { NavigationLoader } from '@/components/feedback'

function Go() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate('/tutor')}>
      Go
    </button>
  )
}

describe('NavigationLoader', () => {
  afterEach(() => {
    cleanup()
  })

  it('stays hidden until the route changes', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <NavigationLoader />
        <Routes>
          <Route path="/login" element={<Go />} />
          <Route path="/tutor" element={<h1>Tutor</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('progressbar', { name: 'Loading page' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(screen.getByRole('heading', { name: 'Tutor' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Loading page' })).toBeInTheDocument()
  })
})
