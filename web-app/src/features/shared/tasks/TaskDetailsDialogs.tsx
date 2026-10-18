import type { FormEvent } from 'react'

import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { TaskType } from '@/services/tasks'

export function TaskDetailsDialogs({
  isActing,
  priceOpen,
  setPriceOpen,
  priceValue,
  setPriceValue,
  onSavePrice,
  revisionOpen,
  setRevisionOpen,
  revisionTitle,
  setRevisionTitle,
  revisionDescription,
  setRevisionDescription,
  onCreateRevision,
  editOpen,
  setEditOpen,
  editTopic,
  setEditTopic,
  editType,
  setEditType,
  editCategory,
  setEditCategory,
  editDescription,
  setEditDescription,
  onSaveEdit,
}: {
  isActing: boolean
  priceOpen: boolean
  setPriceOpen: (open: boolean) => void
  priceValue: string
  setPriceValue: (value: string) => void
  onSavePrice: (event: FormEvent) => void
  revisionOpen: boolean
  setRevisionOpen: (open: boolean) => void
  revisionTitle: string
  setRevisionTitle: (value: string) => void
  revisionDescription: string
  setRevisionDescription: (value: string) => void
  onCreateRevision: (event: FormEvent) => void
  editOpen: boolean
  setEditOpen: (open: boolean) => void
  editTopic: string
  setEditTopic: (value: string) => void
  editType: TaskType
  setEditType: (value: TaskType) => void
  editCategory: string
  setEditCategory: (value: string) => void
  editDescription: string
  setEditDescription: (value: string) => void
  onSaveEdit: (event: FormEvent) => void
}) {
  return (
    <>
      <Dialog
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        title="Edit price"
        description="Set or update the task price."
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPriceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-price-form" size="sm" disabled={isActing}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-price-form" onSubmit={onSavePrice}>
          <Field>
            <FieldLabel htmlFor="task-price">Price (USD)</FieldLabel>
            <Input
              id="task-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        title="Create revision"
        description="Open a revision session for this task."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRevisionOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-revision-form" size="sm" disabled={isActing}>
              Create
            </Button>
          </>
        }
      >
        <form id="create-revision-form" onSubmit={onCreateRevision} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="revision-title">Title</FieldLabel>
            <Input
              id="revision-title"
              placeholder="Short summary of the change"
              value={revisionTitle}
              onChange={(e) => setRevisionTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="revision-desc">Description</FieldLabel>
            <Textarea
              id="revision-desc"
              rows={3}
              placeholder="Describe what needs to change…"
              value={revisionDescription}
              onChange={(e) => setRevisionDescription(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit task"
        description="Update topic, type, category, and description."
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-task-form" size="sm" disabled={isActing}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-task-form" onSubmit={onSaveEdit} className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="edit-topic">Topic</FieldLabel>
            <Input
              id="edit-topic"
              placeholder="What is this task about?"
              value={editTopic}
              onChange={(e) => setEditTopic(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-type">Type</FieldLabel>
            <Select
              id="edit-type"
              value={editType}
              onChange={(e) => setEditType(e.target.value as TaskType)}
            >
              <option value="assignment">Assignment</option>
              <option value="tutoring">Tutoring</option>
              <option value="research">Research</option>
              <option value="editing">Editing</option>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-category">Category</FieldLabel>
            <Input
              id="edit-category"
              placeholder="e.g. Calculus"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <Textarea
              id="edit-description"
              rows={4}
              placeholder="Requirements, instructions, or other details…"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>
    </>
  )
}
