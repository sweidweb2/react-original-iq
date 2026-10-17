import { type FormEvent, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Field, FieldError, FieldLabel, Form } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { type FieldErrors, parseForm } from '@/lib/form'
import { createPermission, type RbacPermission, updatePermission } from '@/services/rbac'
import { toastApiError } from '@/services/toast'

import { editPermissionFormSchema, permissionFormSchema } from './rbac.schema'

type FormState = {
  key: string
  name: string
  description: string
  category: string
}

const emptyForm: FormState = {
  key: '',
  name: '',
  description: '',
  category: 'general',
}

type PermissionFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  permission: RbacPermission | null
  onClose: () => void
  onSaved: () => void
}

export function PermissionFormDialog({
  open,
  mode,
  permission,
  onClose,
  onSaved,
}: PermissionFormDialogProps) {
  const [values, setValues] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    if (mode === 'edit' && permission) {
      setValues({
        key: permission.key,
        name: permission.name,
        description: permission.description ?? '',
        category: permission.category,
      })
      return
    }
    setValues(emptyForm)
  }, [open, mode, permission])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        const parsed = parseForm(permissionFormSchema, values)
        if (!parsed.success) {
          setFieldErrors(parsed.fieldErrors)
          return
        }
        setFieldErrors({})
        await createPermission({
          key: parsed.data.key,
          name: parsed.data.name,
          description: parsed.data.description || null,
          category: parsed.data.category,
        })
        toast.success('Permission created')
      } else if (permission) {
        const parsed = parseForm(editPermissionFormSchema, values)
        if (!parsed.success) {
          setFieldErrors(parsed.fieldErrors)
          return
        }
        setFieldErrors({})
        await updatePermission(permission.id, {
          name: parsed.data.name,
          description: parsed.data.description || null,
          category: parsed.data.category,
        })
        toast.success('Permission updated')
      }
      onSaved()
      onClose()
    } catch (error) {
      toastApiError(
        error,
        mode === 'create' ? 'Could not create permission' : 'Could not update permission',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create permission' : 'Edit permission'}
      description="Permission keys are stable identifiers used in future authz checks."
    >
      <Form onSubmit={onSubmit} className="space-y-4">
        <Field>
          <FieldLabel htmlFor="perm-key">Key</FieldLabel>
          <Input
            id="perm-key"
            value={values.key}
            disabled={mode === 'edit'}
            onChange={(e) => setValues((v) => ({ ...v, key: e.target.value }))}
            placeholder="e.g. manage_exports"
          />
          <FieldError>{fieldErrors.key}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="perm-name">Name</FieldLabel>
          <Input
            id="perm-name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="perm-category">Category</FieldLabel>
          <Input
            id="perm-category"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
            placeholder="users, tasks, payments…"
          />
          <FieldError>{fieldErrors.category}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="perm-description">Description</FieldLabel>
          <Input
            id="perm-description"
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          />
          <FieldError>{fieldErrors.description}</FieldError>
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
