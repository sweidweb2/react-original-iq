import { cn } from '@/lib/utils'

const sources = {
  mark: '/brand/logo.png',
  wordmark: '/brand/wordmark.png',
} as const

type BrandLogoProps = {
  variant?: keyof typeof sources
  className?: string
}

export function BrandLogo({ variant = 'mark', className }: BrandLogoProps) {
  return (
    <img src={sources[variant]} alt="Original IQ" className={cn('object-contain', className)} />
  )
}
