import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toast, Toaster } from '@/components/ui'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  act(() => toast.dismiss())
  cleanup()
  vi.useRealTimers()
})

describe('toast', () => {
  it('renders each variant with the right live role', () => {
    render(<Toaster />)

    act(() => {
      toast.success('Saved')
      toast.info('Heads up')
      toast.warning('Almost full')
      toast.error('Failed', { title: 'Upload' })
    })

    expect(screen.getByText('Saved').closest('[role]')).toHaveAttribute('role', 'status')
    expect(screen.getByText('Heads up').closest('[role]')).toHaveAttribute('role', 'status')
    expect(screen.getByText('Almost full').closest('[role]')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Failed').closest('[role]')).toHaveTextContent('Upload')
  })

  it('dismisses immediately when the close button is clicked', () => {
    render(<Toaster />)
    act(() => {
      toast.success('Profile updated', { duration: Infinity })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument()
  })

  it('auto-dismisses after the configured duration', () => {
    render(<Toaster />)
    act(() => {
      toast.info('Quick one', { duration: 1000 })
    })

    act(() => vi.advanceTimersByTime(999))
    expect(screen.getByText('Quick one')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Quick one')).not.toBeInTheDocument()
  })

  it('pauses the timer while hovered', () => {
    render(<Toaster />)
    act(() => {
      toast.success('Hover me', { duration: 1000 })
    })
    const card = screen.getByText('Hover me').closest('[role]')!

    act(() => vi.advanceTimersByTime(500))
    fireEvent.mouseEnter(card)
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('Hover me')).toBeInTheDocument()

    fireEvent.mouseLeave(card)
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByText('Hover me')).not.toBeInTheDocument()
  })
})
