import { cn } from '@/lib/utils'

const sources = {
  mark: { src: '/brand/logo.png', width: 147, height: 126 },
  wordmark: { src: '/brand/wordmark.png', width: 644, height: 164 },
} as const

type BrandLogoProps = {
  variant?: keyof typeof sources
  className?: string
}

export function BrandLogo({ variant = 'mark', className }: BrandLogoProps) {
  const { src, width, height } = sources[variant]
  return (
    <img
      src={src}
      alt="Original IQ"
      width={width}
      height={height}
      className={cn('object-contain', className)}
    />
  )
}
