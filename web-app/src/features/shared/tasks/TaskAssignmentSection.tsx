import type { FormEvent } from 'react'

import { Field, FieldLabel } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { TaskDetail } from '@/services/tasks'
import { type ManagedUser, userDisplayName } from '@/services/users'

import { SectionCard } from '../PortalPageShell'

function nameOf(users: ManagedUser[], id: string | null, fallback: string): string {
  if (!id) return fallback
  const match = users.find((user) => user.id === id)
  return match ? userDisplayName(match) : fallback
}

export function TaskTutorSection({
  task,
  tutors,
  isLoading,
  isActing,
  selectedTutorId,
  onSelectedTutorIdChange,
  onAssignTutor,
  onRemoveTutor,
}: {
  task: TaskDetail
  tutors: ManagedUser[]
  isLoading: boolean
  isActing: boolean
  selectedTutorId: string
  onSelectedTutorIdChange: (value: string) => void
  onAssignTutor: (event: FormEvent) => void
  onRemoveTutor: () => void
}) {
  const isAssigned = Boolean(task.tutorId)
  const isOpen = task.status !== 'completed' && task.status !== 'cancelled'

  if (isAssigned) {
    return (
      <SectionCard title="Tutor" description="The tutor working on this task.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="task-tutor-current">Assigned tutor</FieldLabel>
            <Select id="task-tutor-current" value="current" disabled>
              <option value="current">
                {isLoading ? 'Loading…' : nameOf(tutors, task.tutorId, 'Assigned tutor')}
              </option>
            </Select>
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={isActing || !isOpen}
            onClick={onRemoveTutor}
          >
            Remove tutor
          </Button>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Tutor" description="Pick an active tutor for this task.">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onAssignTutor}>
        <Field className="flex-1">
          <FieldLabel htmlFor="task-tutor-select">Tutor</FieldLabel>
          <Select
            id="task-tutor-select"
            value={selectedTutorId}
            onChange={(event) => onSelectedTutorIdChange(event.target.value)}
            disabled={isLoading || tutors.length === 0}
          >
            <option value="">
              {isLoading
                ? 'Loading tutors…'
                : tutors.length === 0
                  ? 'No active tutors'
                  : 'Select tutor…'}
            </option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {userDisplayName(tutor)}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={isActing || !selectedTutorId || !isOpen}>
          Assign tutor
        </Button>
      </form>
    </SectionCard>
  )
}

export function TaskCoordinatorSection({
  task,
  coordinators,
  isLoading,
  isActing,
  selectedCoordId,
  onSelectedCoordIdChange,
  onChangeCoordinator,
}: {
  task: TaskDetail
  coordinators: ManagedUser[]
  isLoading: boolean
  isActing: boolean
  selectedCoordId: string
  onSelectedCoordIdChange: (value: string) => void
  onChangeCoordinator: (event: FormEvent) => void
}) {
  const currentMissing =
    Boolean(task.coordinatorId) && !coordinators.some((coord) => coord.id === task.coordinatorId)
  const unchanged = selectedCoordId === (task.coordinatorId ?? '')

  return (
    <SectionCard title="Coordinator" description="The coordinator responsible for this task.">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onChangeCoordinator}>
        <Field className="flex-1">
          <FieldLabel htmlFor="task-coord-select">Coordinator</FieldLabel>
          <Select
            id="task-coord-select"
            value={selectedCoordId}
            onChange={(event) => onSelectedCoordIdChange(event.target.value)}
            disabled={isLoading}
          >
            <option value="" disabled={Boolean(task.coordinatorId)}>
              {isLoading ? 'Loading coordinators…' : 'Select coordinator…'}
            </option>
            {currentMissing && task.coordinatorId ? (
              <option value={task.coordinatorId}>Current coordinator (inactive)</option>
            ) : null}
            {coordinators.map((coord) => (
              <option key={coord.id} value={coord.id}>
                {userDisplayName(coord)}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={isActing || !selectedCoordId || unchanged}>
          {task.coordinatorId ? 'Change coordinator' : 'Assign coordinator'}
        </Button>
      </form>
    </SectionCard>
  )
}
