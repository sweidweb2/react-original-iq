import type { FormEvent } from 'react'

import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { TaskType } from '@/services/tasks'
import type { ManagedUser } from '@/services/users'
import { userDisplayName } from '@/services/users'

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
  assignOpen,
  setAssignOpen,
  selectedTutorId,
  setSelectedTutorId,
  tutors,
  onAssignTutor,
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
  coordOpen,
  setCoordOpen,
  selectedCoordId,
  setSelectedCoordId,
  coordinators,
  onChangeCoordinator,
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
  assignOpen: boolean
  setAssignOpen: (open: boolean) => void
  selectedTutorId: string
  setSelectedTutorId: (value: string) => void
  tutors: ManagedUser[]
  onAssignTutor: (event: FormEvent) => void
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
  coordOpen: boolean
  setCoordOpen: (open: boolean) => void
  selectedCoordId: string
  setSelectedCoordId: (value: string) => void
  coordinators: ManagedUser[]
  onChangeCoordinator: (event: FormEvent) => void
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
            <Button type="button" variant="outline" size="sm" onClick={() => setPriceOpen(false)}>
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
            <Button type="button" variant="outline" size="sm" onClick={() => setRevisionOpen(false)}>
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
              value={revisionTitle}
              onChange={(e) => setRevisionTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="revision-desc">Description</FieldLabel>
            <Textarea
              id="revision-desc"
              rows={3}
              value={revisionDescription}
              onChange={(e) => setRevisionDescription(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign tutor"
        description="Pick an active tutor for this task."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="assign-tutor-form"
              size="sm"
              disabled={isActing || !selectedTutorId}
            >
              Assign
            </Button>
          </>
        }
      >
        <form id="assign-tutor-form" onSubmit={onAssignTutor}>
          <Field>
            <FieldLabel htmlFor="tutor-select">Tutor</FieldLabel>
            <Select
              id="tutor-select"
              value={selectedTutorId}
              onChange={(e) => setSelectedTutorId(e.target.value)}
            >
              <option value="">Select tutor…</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {userDisplayName(tutor)}
                </option>
              ))}
            </Select>
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
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
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
            <Input id="edit-topic" value={editTopic} onChange={(e) => setEditTopic(e.target.value)} />
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
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <Textarea
              id="edit-description"
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={coordOpen}
        onClose={() => setCoordOpen(false)}
        title="Change coordinator"
        description="Reassign this task to another coordinator."
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setCoordOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="change-coord-form"
              size="sm"
              disabled={isActing || !selectedCoordId}
            >
              Save
            </Button>
          </>
        }
      >
        <form id="change-coord-form" onSubmit={onChangeCoordinator}>
          <Field>
            <FieldLabel htmlFor="coord-select">Coordinator</FieldLabel>
            <Select
              id="coord-select"
              value={selectedCoordId}
              onChange={(e) => setSelectedCoordId(e.target.value)}
            >
              <option value="">Select coordinator…</option>
              {coordinators.map((coord) => (
                <option key={coord.id} value={coord.id}>
                  {userDisplayName(coord)}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Dialog>
    </>
  )
}
