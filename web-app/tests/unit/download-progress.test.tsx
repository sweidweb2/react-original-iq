import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DownloadProgressPanel } from '@/components/feedback/download-progress'
import { apiDownload, bindAuthSession } from '@/services/api'
import { type ActiveDownload, useDownloadStore } from '@/stores/downloadStore'

function streamResponse(chunks: string[], headers: Record<string, string>): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers })
}

describe('apiDownload progress', () => {
  const snapshots: ActiveDownload[][] = []
  let unsubscribe = () => {}

  beforeEach(() => {
    snapshots.length = 0
    useDownloadStore.setState({ downloads: [] })
    unsubscribe = useDownloadStore.subscribe((state) => snapshots.push(state.downloads))
    bindAuthSession({
      getAccessToken: () => 'token',
      getRefreshToken: () => null,
      setTokens: vi.fn(),
      clearSession: vi.fn(),
    })
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    unsubscribe()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('goes from preparing to downloading with the exact size, then clears', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      streamResponse(['hello ', 'world'], {
        'Content-Length': '11',
        'Content-Disposition': 'attachment; filename="backup_users.csv"',
      }),
    )

    await apiDownload('/backups', 'backup', { label: 'Backup · users (CSV)' })

    expect(snapshots[0]).toEqual([
      expect.objectContaining({ label: 'Backup · users (CSV)', phase: 'preparing' }),
    ])
    expect(snapshots).toContainEqual([
      expect.objectContaining({ phase: 'downloading', totalBytes: 11, estimated: false }),
    ])
    expect(snapshots).toContainEqual([expect.objectContaining({ loadedBytes: 11 })])
    expect(useDownloadStore.getState().downloads).toEqual([])
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
  })

  it('uses the server estimate when there is no Content-Length', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      streamResponse(['zipdata'], { 'X-Estimated-Size': '5000' }),
    )

    await apiDownload('/backups', 'backup.zip')

    expect(snapshots).toContainEqual([
      expect.objectContaining({ label: 'backup.zip', totalBytes: 5000, estimated: true }),
    ])
  })

  it('clears the entry when the server rejects the export', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Only super admins can export data' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(apiDownload('/exports/users', 'users.csv')).rejects.toMatchObject({
      status: 403,
    })
    expect(useDownloadStore.getState().downloads).toEqual([])
  })
})

describe('DownloadProgressPanel', () => {
  afterEach(() => {
    cleanup()
    useDownloadStore.setState({ downloads: [] })
  })

  it('renders nothing when idle', () => {
    const { container } = render(<DownloadProgressPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a spinner, phase text and a progress line per download', () => {
    useDownloadStore.setState({
      downloads: [
        {
          id: 1,
          label: 'Backup · all tables (SQL)',
          phase: 'preparing',
          loadedBytes: 0,
          totalBytes: null,
          estimated: false,
        },
        {
          id: 2,
          label: 'Backup · users (CSV)',
          phase: 'downloading',
          loadedBytes: 1024,
          totalBytes: 2048,
          estimated: false,
        },
        {
          id: 3,
          label: 'Backup · full storage (zip)',
          phase: 'downloading',
          loadedBytes: 9000,
          totalBytes: 4096,
          estimated: true,
        },
      ],
    })
    render(<DownloadProgressPanel />)

    expect(screen.getByText('Preparing file…')).toBeVisible()
    expect(screen.getByText('50% · 1.0 KB of 2.0 KB')).toBeVisible()
    expect(screen.getByText('99% · 8.8 KB of about 4.0 KB')).toBeVisible()

    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(3)
    expect(bars[0]).not.toHaveAttribute('aria-valuenow')
    expect(bars[1]).toHaveAttribute('aria-valuenow', '50')
    expect(bars[2]).toHaveAttribute('aria-valuenow', '99')
  })
})
