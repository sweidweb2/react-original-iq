import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type PagedListResult,
  usePagedAdminList,
  type UsePagedAdminListOptions,
} from '@/features/admin/_shared/usePagedAdminList'
import { toastApiError, toastSuccess } from '@/services/toast'

vi.mock('@/services/toast', () => ({
  toastApiError: vi.fn(),
  toastSuccess: vi.fn(),
}))

type Row = { id: string; email: string }

function rowsFor(page: number, limit: number, total: number): Row[] {
  const start = (page - 1) * limit
  const count = Math.max(0, Math.min(limit, total - start))
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${start + i + 1}`,
    email: `lead${start + i + 1}@example.com`,
  }))
}

function pageOf(page: number, limit: number, total: number): PagedListResult<Row> {
  return { data: rowsFor(page, limit, total), meta: { page, limit, total } }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function setup(overrides: Partial<UsePagedAdminListOptions<Row>> = {}) {
  const fetchPage = vi.fn<UsePagedAdminListOptions<Row>['fetchPage']>(async ({ page, limit }) =>
    pageOf(page, limit, 23),
  )
  const deleteRow = vi.fn<UsePagedAdminListOptions<Row>['deleteRow']>(async () => undefined)
  const options: UsePagedAdminListOptions<Row> = {
    fetchPage,
    deleteRow,
    deleteSuccessMessage: 'Lead deleted',
    deleteErrorMessage: "Couldn't delete the lead",
    rowLabel: (row) => row.email,
    ...overrides,
  }
  const hook = renderHook(() => usePagedAdminList(options))
  return { hook, options, fetchPage: options.fetchPage as typeof fetchPage, deleteRow }
}

describe('usePagedAdminList', () => {
  beforeEach(() => {
    vi.mocked(toastApiError).mockClear()
    vi.mocked(toastSuccess).mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads the first page and derives the range', async () => {
    const { hook, fetchPage } = setup()

    expect(hook.result.current.isLoading).toBe(true)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    expect(fetchPage).toHaveBeenCalledWith({ page: 1, limit: 10, search: undefined })
    expect(hook.result.current.rows).toHaveLength(10)
    expect(hook.result.current.totalPages).toBe(3)
    expect(hook.result.current.rangeStart).toBe(1)
    expect(hook.result.current.rangeEnd).toBe(10)
    expect(hook.result.current.error).toBeNull()
  })

  it('fetches the next page and reports a partial last range', async () => {
    const { hook, fetchPage } = setup()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    act(() => hook.result.current.setPage(3))

    await waitFor(() => expect(hook.result.current.meta?.page).toBe(3))
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, limit: 10, search: undefined })
    expect(hook.result.current.rows.map((row) => row.id)).toEqual(['row-21', 'row-22', 'row-23'])
    expect(hook.result.current.rangeStart).toBe(21)
    expect(hook.result.current.rangeEnd).toBe(23)
  })

  it('honours a custom page size', async () => {
    const { hook, fetchPage } = setup({ pageSize: 5 })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    expect(fetchPage).toHaveBeenCalledWith({ page: 1, limit: 5, search: undefined })
    expect(hook.result.current.totalPages).toBe(5)
  })

  it('reports an empty list as a zero range on one page', async () => {
    const { hook } = setup({ fetchPage: async ({ page, limit }) => pageOf(page, limit, 0) })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    expect(hook.result.current.rows).toEqual([])
    expect(hook.result.current.totalPages).toBe(1)
    expect(hook.result.current.rangeStart).toBe(0)
    expect(hook.result.current.rangeEnd).toBe(0)
  })

  it('debounces and trims the search, then resets to page 1', async () => {
    const { hook, fetchPage } = setup()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    act(() => hook.result.current.setPage(2))
    await waitFor(() => expect(hook.result.current.meta?.page).toBe(2))
    fetchPage.mockClear()

    act(() => hook.result.current.setSearchInput('  ada  '))
    expect(hook.result.current.search).toBe('')
    expect(fetchPage).not.toHaveBeenCalled()

    await waitFor(() => expect(hook.result.current.search).toBe('ada'))
    await waitFor(() =>
      expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, limit: 10, search: 'ada' }),
    )
    expect(hook.result.current.page).toBe(1)
  })

  it('moves back to the last page when the current page no longer exists', async () => {
    let total = 23
    const { hook, fetchPage } = setup({
      fetchPage: vi.fn(async ({ page, limit }) => pageOf(page, limit, total)),
    })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    act(() => hook.result.current.setPage(3))
    await waitFor(() => expect(hook.result.current.meta?.page).toBe(3))

    total = 20
    act(() => hook.result.current.refresh())

    await waitFor(() => expect(hook.result.current.page).toBe(2))
    await waitFor(() => expect(hook.result.current.meta?.page).toBe(2))
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 2, limit: 10, search: undefined })
    expect(hook.result.current.rows).toHaveLength(10)
  })

  it('ignores a response that arrives after the page changed', async () => {
    const first = deferred<PagedListResult<Row>>()
    const second = deferred<PagedListResult<Row>>()
    const fetchPage = vi
      .fn<UsePagedAdminListOptions<Row>['fetchPage']>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { hook } = setup({ fetchPage })

    act(() => hook.result.current.setPage(2))
    await act(async () => second.resolve(pageOf(2, 10, 23)))
    await act(async () => first.resolve(pageOf(1, 10, 23)))

    expect(hook.result.current.meta?.page).toBe(2)
    expect(hook.result.current.rows[0]?.id).toBe('row-11')
  })

  it('exposes a load error and clears it on refresh', async () => {
    const failure = new Error('boom')
    const fetchPage = vi
      .fn<UsePagedAdminListOptions<Row>['fetchPage']>()
      .mockRejectedValueOnce(failure)
      .mockImplementation(async ({ page, limit }) => pageOf(page, limit, 3))
    const { hook } = setup({ fetchPage })

    await waitFor(() => expect(hook.result.current.error).toBe(failure))
    expect(hook.result.current.isLoading).toBe(false)

    act(() => hook.result.current.refresh())

    await waitFor(() => expect(hook.result.current.rows).toHaveLength(3))
    expect(hook.result.current.error).toBeNull()
  })

  it('deletes the pending row, toasts with its label, and reloads', async () => {
    const onDeleted = vi.fn()
    const { hook, fetchPage, deleteRow } = setup({ onDeleted })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    const target = hook.result.current.rows[0]!
    fetchPage.mockClear()

    act(() => hook.result.current.setPendingDelete(target))
    await act(() => hook.result.current.confirmDelete())

    expect(deleteRow).toHaveBeenCalledWith('row-1')
    expect(toastSuccess).toHaveBeenCalledWith('Lead deleted', '“lead1@example.com” was deleted.')
    expect(onDeleted).toHaveBeenCalledWith(target)
    expect(hook.result.current.pendingDelete).toBeNull()
    expect(hook.result.current.isActing).toBe(false)
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1))
  })

  it('keeps the row pending and toasts the error when delete fails', async () => {
    const failure = new Error('nope')
    const onDeleted = vi.fn()
    const { hook, fetchPage } = setup({
      onDeleted,
      deleteRow: vi.fn(async () => {
        throw failure
      }),
    })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    const target = hook.result.current.rows[1]!
    fetchPage.mockClear()

    act(() => hook.result.current.setPendingDelete(target))
    await act(() => hook.result.current.confirmDelete())

    expect(toastApiError).toHaveBeenCalledWith(
      failure,
      "Couldn't delete the lead: “lead2@example.com”",
    )
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(hook.result.current.pendingDelete).toBe(target)
    expect(hook.result.current.isActing).toBe(false)
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('omits the label from toasts when the row has none', async () => {
    const { hook } = setup({ rowLabel: () => null })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    act(() => hook.result.current.setPendingDelete(hook.result.current.rows[0]!))
    await act(() => hook.result.current.confirmDelete())

    expect(toastSuccess).toHaveBeenCalledWith('Lead deleted', undefined)
  })

  it('does nothing when no row is pending', async () => {
    const { hook, deleteRow } = setup()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    await act(() => hook.result.current.confirmDelete())

    expect(deleteRow).not.toHaveBeenCalled()
  })
})
