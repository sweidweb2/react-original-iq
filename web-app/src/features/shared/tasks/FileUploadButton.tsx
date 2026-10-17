import { type ChangeEvent, useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TASK_UPLOAD_ACCEPT } from '@/services/tasks'

export function FileUploadButton({
  label,
  isUploading,
  disabled,
  onFiles,
}: {
  label: string
  isUploading: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

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
      <p className="mt-1.5 text-xs text-muted-foreground">
        PDF, Office, images, text or ZIP · up to 25 MB each
      </p>
    </div>
  )
}
