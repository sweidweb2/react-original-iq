import { useEffect, useRef, useState } from 'react'

import { toast } from '@/components/ui/toast'
import type { ContactListMeta } from '@/services/contact'
import { toastApiError } from '@/services/toast'

export const ADMIN_LIST_PAGE_SIZE = 10

export type PagedListResult<T> = {
  data: T[]
  meta: ContactListMeta
}

export type UsePagedAdminListOptions<T extends { id: string }> = {
  pageSize?: number
  fetchPage: (args: {
    page: number
    limit: number
    search?: string
  }) => Promise<PagedListResult<T>>
  deleteRow: (id: string) => Promise<void>
  exportRows: (search?: string) => Promise<void>
  deleteSuccessMessage: string
  deleteErrorMessage: string
  exportErrorMessage: string
  /** Optional side effect when a row is deleted (e.g. clear view dialog). */
  onDeleted?: (row: T) => void
}

export function usePagedAdminList<T extends { id: string }>(
  options: UsePagedAdminListOptions<T>,
) {
  const pageSize = options.pageSize ?? ADMIN_LIST_PAGE_SIZE
  const optionsRef = useRef(options)
  optionsRef.current = options

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [rows, setRows] = useState<T[]>([])
  const [meta, setMeta] = useState<ContactListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [pendingDelete, setPendingDelete] = useState<T | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    optionsRef.current
      .fetchPage({ page, limit: pageSize, search: search || undefined })
      .then((result) => {
        if (cancelled) return
        const totalPages = Math.max(1, Math.ceil(result.meta.total / result.meta.limit))
        if (page > totalPages) {
          setPage(totalPages)
          return
        }
        setRows(result.data)
        setMeta(result.meta)
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, reloadKey, pageSize])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const current = optionsRef.current
    setIsActing(true)
    try {
      await current.deleteRow(pendingDelete.id)
      toast.success(current.deleteSuccessMessage)
      current.onDeleted?.(pendingDelete)
      setPendingDelete(null)
      refresh()
    } catch (actionError) {
      toastApiError(actionError, current.deleteErrorMessage)
    } finally {
      setIsActing(false)
    }
  }

  async function handleExport() {
    const current = optionsRef.current
    setIsExporting(true)
    try {
      await current.exportRows(search || undefined)
      toast.success('Export started')
    } catch (exportError) {
      toastApiError(exportError, current.exportErrorMessage)
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / pageSize))
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  return {
    page,
    setPage,
    searchInput,
    setSearchInput,
    search,
    rows,
    meta,
    isLoading,
    error,
    pendingDelete,
    setPendingDelete,
    isActing,
    isExporting,
    refresh,
    confirmDelete,
    handleExport,
    totalPages,
    rangeStart,
    rangeEnd,
  }
}
