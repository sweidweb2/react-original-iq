import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuthStore } from '@/stores/authStore'

type PanelHomeProps = {
  title: string
  description: string
}

export function PanelHomePage({ title, description }: PanelHomeProps) {
  useDocumentTitle(title)
  const user = useAuthStore((s) => s.user)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {user ? (
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span> (
          {user.role})
        </p>
      ) : null}
    </div>
  )
}
