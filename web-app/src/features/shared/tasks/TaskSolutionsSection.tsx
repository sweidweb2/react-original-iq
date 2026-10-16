import type { FormEvent } from 'react'

import { EmptyState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TaskDetail } from '@/services/tasks'

import { SectionCard } from '../PortalPageShell'

export function TaskSolutionsSection({
  task,
  canManage,
  isActing,
  solutionLocation,
  onSolutionLocationChange,
  onAddSolution,
  onRemoveSolution,
}: {
  task: TaskDetail
  canManage: boolean
  isActing: boolean
  solutionLocation: string
  onSolutionLocationChange: (value: string) => void
  onAddSolution: (event: FormEvent) => void
  onRemoveSolution: (solutionId: string) => void
}) {
  return (
    <SectionCard title="Solutions" description="Submitted work.">
      {canManage ? (
        <form className="mb-4 grid gap-2" onSubmit={onAddSolution}>
          <Input
            placeholder="Solution file location"
            value={solutionLocation}
            onChange={(e) => onSolutionLocationChange(e.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={isActing}>
            Add solution
          </Button>
        </form>
      ) : null}
      {task.solutions.length === 0 ? (
        <EmptyState title="No solutions" description="Tutors and staff can attach solution files." />
      ) : (
        <ul className="space-y-2 text-sm">
          {task.solutions.map((solution) => (
            <li
              key={solution.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <a
                href={solution.fileLocation}
                className="font-medium text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {solution.fileLocation}
              </a>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => onRemoveSolution(solution.id)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
