import { User } from 'lucide-react'
import type { ReactNode } from 'react'

type AuthCardProps = {
  badge: string
  subtitle: string
  children: ReactNode
}

export function AuthCard({ badge, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-lg bg-card shadow-lg">
      <div className="relative overflow-hidden bg-gradient-to-b from-primary-light to-primary px-6 pt-5 pb-14 text-center text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(255,255,255,0.22) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.22) 75%), linear-gradient(45deg, rgba(255,255,255,0.22) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.22) 75%)',
            backgroundSize: '22px 22px',
            backgroundPosition: '0 0, 11px 11px',
          }}
        />
        <span className="pointer-events-none absolute top-10 left-8 size-14 rounded-full bg-white/20" />
        <span className="pointer-events-none absolute right-8 bottom-12 size-16 rounded-full bg-white/15" />
        <span className="absolute top-4 right-4 rounded-full bg-white/25 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-white/95">
          {badge}
        </span>
        <div className="relative mx-auto flex size-[84px] items-center justify-center rounded-full bg-white text-primary shadow-md">
          <User className="size-10" aria-hidden />
        </div>
        <h1 className="relative mt-4 text-3xl font-bold tracking-tight">Original IQ</h1>
        <p className="relative mt-1 text-sm text-white/90">{subtitle}</p>
        <svg
          className="absolute inset-x-0 -bottom-px h-12 w-full text-card"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path fill="currentColor" d="M0,32 C320,80 1120,0 1440,36 L1440,80 L0,80 Z" />
        </svg>
      </div>
      <div className="px-8 pt-2 pb-8">{children}</div>
    </div>
  )
}
