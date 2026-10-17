import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Pencil, Plus, Shield, Trash2 } from 'lucide-react'

import { AsyncState, EmptyState } from '@/components/feedback'
import { PageHeader } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { IconAction } from '@/components/ui/icon-action'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import {
  deletePermission,
  deleteRole,
  listPermissions,
  listRoles,
  type RbacPermission,
  type RbacRole,
} from '@/services/rbac'
import { toastApiError, toastSuccess } from '@/services/toast'

import { AssignPermissionsDialog } from './AssignPermissionsDialog'
import { PermissionFormDialog } from './PermissionFormDialog'
import { RoleFormDialog } from './RoleFormDialog'

type Tab = 'roles' | 'permissions'

export function ManageRbacPage() {
  useDocumentTitle('Roles & permissions')

  const [tab, setTab] = useState<Tab>('roles')
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [permissions, setPermissions] = useState<RbacPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [roleForm, setRoleForm] = useState<{
    mode: 'create' | 'edit'
    role: RbacRole | null
  } | null>(null)
  const [permissionForm, setPermissionForm] = useState<{
    mode: 'create' | 'edit'
    permission: RbacPermission | null
  } | null>(null)
  const [assignRole, setAssignRole] = useState<RbacRole | null>(null)
  const [pendingDelete, setPendingDelete] = useState<
    { type: 'role'; item: RbacRole } | { type: 'permission'; item: RbacPermission } | null
  >(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([listRoles(), listPermissions()])
      .then(([roleList, permissionList]) => {
        if (cancelled) return
        setRoles(roleList.data)
        setPermissions(permissionList.data)
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function refresh() {
    setReloadKey((value) => value + 1)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const kind = pendingDelete.type === 'role' ? 'role' : 'permission'
    const name = pendingDelete.item.name
    setIsDeleting(true)
    try {
      if (pendingDelete.type === 'role') {
        await deleteRole(pendingDelete.item.id)
        toastSuccess('Role deleted', `“${name}” was removed.`)
      } else {
        await deletePermission(pendingDelete.item.id)
        toastSuccess('Permission deleted', `“${name}” was removed.`)
      }
      setPendingDelete(null)
      refresh()
    } catch (actionError) {
      toastApiError(actionError, `Couldn't delete the ${kind} “${name}”`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Seeded RBAC catalog — edit roles, permissions, and assignments. Runtime auth still uses users.role until you wire enforcement."
        actions={
          tab === 'roles' ? (
            <Button type="button" onClick={() => setRoleForm({ mode: 'create', role: null })}>
              <Plus className="size-4" />
              Add role
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setPermissionForm({ mode: 'create', permission: null })}
            >
              <Plus className="size-4" />
              Add permission
            </Button>
          )
        }
      />

      <div className="flex gap-2">
        {(
          [
            { id: 'roles' as const, label: 'Roles', icon: Shield },
            { id: 'permissions' as const, label: 'Permissions', icon: KeyRound },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium',
              tab === item.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      <AsyncState isLoading={isLoading} error={error} onRetry={refresh}>
        {tab === 'roles' ? (
          roles.length === 0 ? (
            <EmptyState
              title="No roles yet"
              description="Run npm run db:seed:rbac in backend, or create a role here."
            />
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <Card key={role.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{role.name}</p>
                        <Badge tone="neutral">{role.key}</Badge>
                        {role.isSystem ? <Badge tone="neutral">System</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {role.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {role.permissionIds.length} permission
                        {role.permissionIds.length === 1 ? '' : 's'} assigned
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAssignRole(role)}
                      >
                        Assign
                      </Button>
                      <IconAction
                        label="Edit role"
                        onClick={() => setRoleForm({ mode: 'edit', role })}
                      >
                        <Pencil className="size-4" />
                      </IconAction>
                      {!role.isSystem ? (
                        <IconAction
                          label="Delete role"
                          tone="danger"
                          onClick={() => setPendingDelete({ type: 'role', item: role })}
                        >
                          <Trash2 className="size-4" />
                        </IconAction>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : permissions.length === 0 ? (
          <EmptyState
            title="No permissions yet"
            description="Run the RBAC seed or create permissions manually."
          />
        ) : (
          <div className="space-y-3">
            {permissions.map((permission) => (
              <Card key={permission.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{permission.name}</p>
                      <Badge tone="neutral">{permission.category}</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{permission.key}</p>
                    <p className="text-sm text-muted-foreground">
                      {permission.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <IconAction
                      label="Edit permission"
                      onClick={() => setPermissionForm({ mode: 'edit', permission })}
                    >
                      <Pencil className="size-4" />
                    </IconAction>
                    <IconAction
                      label="Delete permission"
                      tone="danger"
                      onClick={() => setPendingDelete({ type: 'permission', item: permission })}
                    >
                      <Trash2 className="size-4" />
                    </IconAction>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AsyncState>

      <RoleFormDialog
        open={Boolean(roleForm)}
        mode={roleForm?.mode ?? 'create'}
        role={roleForm?.role ?? null}
        onClose={() => setRoleForm(null)}
        onSaved={refresh}
      />

      <PermissionFormDialog
        open={Boolean(permissionForm)}
        mode={permissionForm?.mode ?? 'create'}
        permission={permissionForm?.permission ?? null}
        onClose={() => setPermissionForm(null)}
        onSaved={refresh}
      />

      <AssignPermissionsDialog
        open={Boolean(assignRole)}
        role={assignRole}
        permissions={permissions}
        onClose={() => setAssignRole(null)}
        onSaved={refresh}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={pendingDelete?.type === 'role' ? 'Delete role?' : 'Delete permission?'}
        description={
          pendingDelete?.type === 'role'
            ? `Remove “${pendingDelete.item.name}”? This cannot be undone.`
            : pendingDelete
              ? `Remove “${pendingDelete.item.name}”? It will also drop from role and user assignments.`
              : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </>
        }
      />
    </div>
  )
}
