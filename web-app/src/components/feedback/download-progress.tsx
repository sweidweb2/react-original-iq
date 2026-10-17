import { Loader2 } from 'lucide-react'

import { formatBytes } from '@/lib/formatBytes'
import { cn } from '@/lib/utils'
import { type ActiveDownload, useDownloadStore } from '@/stores/downloadStore'
import { zIndex } from '@/theme/zIndex'

/** 0–1, or null when the size is unknown (indeterminate bar). */
function fraction(item: ActiveDownload): number | null {
  if (item.phase === 'preparing' || !item.totalBytes) return null
  return Math.min(item.loadedBytes / item.totalBytes, item.estimated ? 0.99 : 1)
}

function describe(item: ActiveDownload, value: number | null): string {
  if (item.phase === 'preparing') return 'Preparing file…'
  if (value === null) return `${formatBytes(item.loadedBytes)} received`
  const of = `${item.estimated ? 'about ' : ''}${formatBytes(item.totalBytes)}`
  return `${Math.round(value * 100)}% · ${formatBytes(item.loadedBytes)} of ${of}`
}

export function ProgressLine({ value, label }: { value: number | null; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary',
          value === null
            ? 'w-2/5 animate-[progress-indeterminate_1.2s_ease-in-out_infinite]'
            : 'transition-[width] duration-200',
        )}
        style={value === null ? undefined : { width: `${value * 100}%` }}
      />
    </div>
  )
}

function DownloadRow({ item }: { item: ActiveDownload }) {
  const value = fraction(item)
  return (
    <li className="pointer-events-auto rounded-lg border border-border bg-card p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">{describe(item, value)}</p>
      <div className="mt-2">
        <ProgressLine value={value} label={`${item.label} progress`} />
      </div>
    </li>
  )
}

/** Floating list of in-flight downloads (exports, backups, zips). */
export function DownloadProgressPanel() {
  const downloads = useDownloadStore((state) => state.downloads)
  if (downloads.length === 0) return null

  return (
    <section
      aria-label="Downloads"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 sm:inset-x-auto sm:top-auto sm:bottom-4 sm:start-4 sm:w-80"
      style={{ zIndex: zIndex.toast }}
    >
      <ul className="flex flex-col gap-2">
        {downloads.map((item) => (
          <DownloadRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}
