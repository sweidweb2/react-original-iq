import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { assignRolePermissions, type RbacPermission, type RbacRole } from '@/services/rbac'
import { toastApiError } from '@/services/toast'

type AssignPermissionsDialogProps = {
  open: boolean
  role: RbacRole | null
  permissions: RbacPermission[]
  onClose: () => void
  onSaved: () => void
}

export function AssignPermissionsDialog({
  open,
  role,
  permissions,
  onClose,
  onSaved,
}: AssignPermissionsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !role) return
    setSelected(new Set(role.permissionIds))
  }, [open, role])

  const byCategory = useMemo(() => {
    const map = new Map<string, RbacPermission[]>()
    for (const permission of permissions) {
      const list = map.get(permission.category) ?? []
      list.push(permission)
      map.set(permission.category, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSave() {
    if (!role) return
    setIsSubmitting(true)
    try {
      await assignRolePermissions(role.id, [...selected])
      toast.success('Permissions assigned')
      onSaved()
      onClose()
    } catch (error) {
      toastApiError(error, 'Could not assign permissions')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={role ? `Assign permissions — ${role.name}` : 'Assign permissions'}
      description="Toggle which permissions this role grants. You can change these anytime."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={isSubmitting || !role}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save assignment
          </Button>
        </>
      }
    >
      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions yet. Create some first.</p>
        ) : (
          byCategory.map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {category}
              </p>
              <ul className="space-y-2">
                {items.map((permission) => {
                  const checked = selected.has(permission.id)
                  return (
                    <li key={permission.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2',
                          checked ? 'border-primary/40 bg-primary/5' : 'border-border',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggle(permission.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{permission.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {permission.key}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </Dialog>
  )
}
