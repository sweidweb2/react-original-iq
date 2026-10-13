import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from './button'

type FileUploadProps = {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  label?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function FileUpload({
  onFiles,
  accept,
  multiple = false,
  label = 'Upload a file',
  hint,
  disabled = false,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function emit(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (files.length === 0 || disabled) return
    onFiles(files)
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-6 text-center',
        dragging && 'border-primary bg-primary/5',
        disabled && 'opacity-50',
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) emit(event.dataTransfer.files)
      }}
    >
      <Upload className="size-5 text-primary" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          emit(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
