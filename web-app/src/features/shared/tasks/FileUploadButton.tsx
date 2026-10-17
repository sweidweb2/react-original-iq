import { type ChangeEvent, useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TASK_UPLOAD_ACCEPT } from '@/services/tasks'

import type { UploadProgress } from './useTaskDetails'

export function FileUploadButton({
  label,
  progress,
  disabled,
  onFiles,
}: {
  label: string
  progress: UploadProgress | null
  disabled?: boolean
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isUploading = progress !== null

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) onFiles(files)
  }

  return (
    <div className="mb-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={TASK_UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onChange}
      />
      <Button
        type="button"
        size="sm"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {isUploading ? 'Uploading…' : label}
      </Button>
      {progress ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-foreground" title={progress.fileName}>
              {progress.fileName}
              {progress.fileCount > 1 ? (
                <span className="text-muted-foreground">
                  {' '}
                  ({progress.fileIndex} of {progress.fileCount})
                </span>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{progress.percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Uploading ${progress.fileName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          PDF, Office, images, text or ZIP · up to 25 MB each
        </p>
      )}
    </div>
  )
}
