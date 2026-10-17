import { type FormEvent, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { type FieldErrors, parseForm } from '@/lib/form'
import { createRole, type RbacRole, updateRole } from '@/services/rbac'
import { toastApiError } from '@/services/toast'

import { editRoleFormSchema, roleFormSchema } from './rbac.schema'

type FormState = {
  key: string
  name: string
  description: string
  sortOrder: string
}

const emptyForm: FormState = {
  key: '',
  name: '',
  description: '',
  sortOrder: '100',
}

type RoleFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  role: RbacRole | null
  onClose: () => void
  onSaved: () => void
}

export function RoleFormDialog({ open, mode, role, onClose, onSaved }: RoleFormDialogProps) {
  const [values, setValues] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    if (mode === 'edit' && role) {
      setValues({
        key: role.key,
        name: role.name,
        description: role.description ?? '',
        sortOrder: String(role.sortOrder),
      })
      return
    }
    setValues(emptyForm)
  }, [open, mode, role])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        const parsed = parseForm(roleFormSchema, values)
        if (!parsed.success) {
          setFieldErrors(parsed.fieldErrors)
          return
        }
        setFieldErrors({})
        await createRole({
          key: parsed.data.key,
          name: parsed.data.name,
          description: parsed.data.description || null,
          sortOrder: parsed.data.sortOrder,
        })
        toast.success('Role created')
      } else if (role) {
        const parsed = parseForm(editRoleFormSchema, values)
        if (!parsed.success) {
          setFieldErrors(parsed.fieldErrors)
          return
        }
        setFieldErrors({})
        await updateRole(role.id, {
          name: parsed.data.name,
          description: parsed.data.description || null,
          sortOrder: parsed.data.sortOrder,
        })
        toast.success('Role updated')
      }
      onSaved()
      onClose()
    } catch (error) {
      toastApiError(error, mode === 'create' ? 'Could not create role' : 'Could not update role')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create role' : 'Edit role'}
      description={
        mode === 'create'
          ? 'Add a custom role. System roles are seeded and editable later.'
          : role?.isSystem
            ? 'System role — key is fixed; you can still rename and reassign permissions.'
            : 'Update role details.'
      }
    >
      <Form onSubmit={onSubmit} className="space-y-4">
        <Field>
          <FieldLabel htmlFor="role-key">Key</FieldLabel>
          <Input
            id="role-key"
            value={values.key}
            disabled={mode === 'edit'}
            onChange={(e) => setValues((v) => ({ ...v, key: e.target.value }))}
            placeholder="e.g. support"
          />
          <FieldError>{fieldErrors.key}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="role-name">Name</FieldLabel>
          <Input
            id="role-name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="role-description">Description</FieldLabel>
          <Input
            id="role-description"
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          />
          <FieldError>{fieldErrors.description}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="role-sort">Sort order</FieldLabel>
          <Input
            id="role-sort"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) => setValues((v) => ({ ...v, sortOrder: e.target.value }))}
          />
          <FieldError>{fieldErrors.sortOrder}</FieldError>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </Form>
    </Dialog>
  )
}
