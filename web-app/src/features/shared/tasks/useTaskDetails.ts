import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import {
  createRevision,
  listRevisionsForTask,
  type RevisionSession,
} from '@/services/revisions'
import { toastApiError } from '@/services/toast'
import {
  activateTask,
  addTaskFile,
  addTaskSolution,
  approveTask,
  assignTutor,
  cancelTask,
  cancelTaskSubmit,
  changeCoordinator,
  deleteTask,
  deleteTaskFile,
  deleteTaskSolution,
  disapproveTask,
  getTask,
  removeTutor,
  setTaskAllowView,
  submitTask,
  type TaskDetail,
  type TaskType,
  updateTask,
  updateTaskPrice,
} from '@/services/tasks'
import { listUsers, type ManagedUser } from '@/services/users'
import { toast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'

export function useTaskDetails() {
  const { taskId = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const userId = useAuthStore((s) => s.user?.id)

  const tasksBase = pathname.replace(/\/[^/]+\/?$/, '')
  const portalBase = tasksBase.replace(/\/tasks\/?$/, '')
  const isStaff = role === 'admin' || role === 'coordinator' || role === 'super'
  const isAdmin = role === 'admin' || role === 'super'
  const isTutor = role === 'tutor'
  const isClient = role === 'client'
  const canViewPayments = isStaff || isClient
  const canManageRevisions = isStaff
  const canEditFields = isStaff || isClient

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [revisions, setRevisions] = useState<RevisionSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [priceOpen, setPriceOpen] = useState(false)
  const [priceValue, setPriceValue] = useState('')
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [revisionTitle, setRevisionTitle] = useState('')
  const [revisionDescription, setRevisionDescription] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [coordOpen, setCoordOpen] = useState(false)
  const [tutors, setTutors] = useState<ManagedUser[]>([])
  const [coordinators, setCoordinators] = useState<ManagedUser[]>([])
  const [selectedTutorId, setSelectedTutorId] = useState('')
  const [selectedCoordId, setSelectedCoordId] = useState('')
  const [editTopic, setEditTopic] = useState('')
  const [editType, setEditType] = useState<TaskType>('assignment')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [fileLocation, setFileLocation] = useState('')
  const [fileNote, setFileNote] = useState('')
  const [solutionLocation, setSolutionLocation] = useState('')
  const [isActing, setIsActing] = useState(false)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [detail, revisionList] = await Promise.all([
          getTask(taskId),
          listRevisionsForTask(taskId).catch(() => ({ data: [] as RevisionSession[] })),
        ])
        if (cancelled) return
        setTask(detail)
        setRevisions(revisionList.data)
        setPriceValue(String(detail.price))
        setEditTopic(detail.topic ?? '')
        setEditType(detail.type ?? 'assignment')
        setEditCategory(detail.category ?? '')
        setEditDescription(detail.description ?? '')
        setSelectedCoordId(detail.coordinatorId ?? '')
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [taskId, reloadKey])

  useEffect(() => {
    if (!assignOpen || !isStaff) return
    let cancelled = false
    void listUsers({ page: 1, limit: 100, role: 'tutor', status: 'ACTIVE' }).then((result) => {
      if (!cancelled) setTutors(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [assignOpen, isStaff])

  useEffect(() => {
    if (!coordOpen || !isAdmin) return
    let cancelled = false
    void listUsers({ page: 1, limit: 100, role: 'coordinator', status: 'ACTIVE' }).then((result) => {
      if (!cancelled) setCoordinators(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [coordOpen, isAdmin])

  async function runAction(label: string, action: () => Promise<unknown>) {
    setIsActing(true)
    try {
      await action()
      toast.success(label)
      reload()
    } catch (err) {
      toastApiError(err, 'Action failed')
    } finally {
      setIsActing(false)
    }
  }

  async function onSavePrice(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    const price = Number(priceValue)
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }
    await runAction('Price updated', () => updateTaskPrice(task.id, price))
    setPriceOpen(false)
  }

  async function onCreateRevision(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    await runAction('Revision created', () =>
      createRevision(task.id, {
        title: revisionTitle.trim() || undefined,
        description: revisionDescription.trim() || undefined,
      }),
    )
    setRevisionOpen(false)
    setRevisionTitle('')
    setRevisionDescription('')
  }

  async function onAssignTutor(event: FormEvent) {
    event.preventDefault()
    if (!task || !selectedTutorId) return
    await runAction('Tutor assigned', () => assignTutor(task.id, selectedTutorId))
    setAssignOpen(false)
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    await runAction('Task updated', () =>
      updateTask(task.id, {
        topic: editTopic.trim(),
        type: editType,
        category: editCategory.trim(),
        description: editDescription.trim(),
      }),
    )
    setEditOpen(false)
  }

  async function onChangeCoordinator(event: FormEvent) {
    event.preventDefault()
    if (!task || !selectedCoordId) return
    await runAction('Coordinator updated', () => changeCoordinator(task.id, selectedCoordId))
    setCoordOpen(false)
  }

  async function onDeleteTask() {
    if (!task) return
    if (!window.confirm('Delete this task permanently?')) return
    setIsActing(true)
    try {
      await deleteTask(task.id)
      toast.success('Task deleted')
      navigate(`${portalBase}/tasks`)
    } catch (err) {
      toastApiError(err, 'Could not delete task')
    } finally {
      setIsActing(false)
    }
  }

  async function onAddFile(event: FormEvent) {
    event.preventDefault()
    if (!task || !fileLocation.trim()) return
    await runAction('File added', async () => {
      await addTaskFile(task.id, fileLocation.trim(), fileNote.trim() || undefined)
      setFileLocation('')
      setFileNote('')
    })
  }

  async function onAddSolution(event: FormEvent) {
    event.preventDefault()
    if (!task || !solutionLocation.trim()) return
    await runAction('Solution added', async () => {
      await addTaskSolution(task.id, solutionLocation.trim())
      setSolutionLocation('')
    })
  }

  const assignedTutor = task?.tutorId === userId
  const ownClient = isClient && task?.clientId === userId
  const canSubmit = isTutor && assignedTutor && task?.status === 'in-progress'
  const canCancelSubmit =
    isTutor && assignedTutor && task?.status === 'waiting_coordinator_approval'
  const canApprove = isStaff && task?.status === 'waiting_coordinator_approval'
  const canDelete = isStaff || ownClient

  return {
    taskId,
    tasksBase,
    task,
    revisions,
    isLoading,
    error,
    reload,
    isStaff,
    isAdmin,
    isTutor,
    isClient,
    userId,
    canViewPayments,
    canManageRevisions,
    canEditFields,
    canSubmit,
    canCancelSubmit,
    canApprove,
    canDelete,
    assignedTutor,
    isActing,
    runAction,
    onDeleteTask,
    onSavePrice,
    onCreateRevision,
    onAssignTutor,
    onSaveEdit,
    onChangeCoordinator,
    onAddFile,
    onAddSolution,
    priceOpen,
    setPriceOpen,
    priceValue,
    setPriceValue,
    revisionOpen,
    setRevisionOpen,
    revisionTitle,
    setRevisionTitle,
    revisionDescription,
    setRevisionDescription,
    assignOpen,
    setAssignOpen,
    editOpen,
    setEditOpen,
    coordOpen,
    setCoordOpen,
    tutors,
    coordinators,
    selectedTutorId,
    setSelectedTutorId,
    selectedCoordId,
    setSelectedCoordId,
    editTopic,
    setEditTopic,
    editType,
    setEditType,
    editCategory,
    setEditCategory,
    editDescription,
    setEditDescription,
    fileLocation,
    setFileLocation,
    fileNote,
    setFileNote,
    solutionLocation,
    setSolutionLocation,
    approveTask,
    disapproveTask,
    cancelTask,
    activateTask,
    submitTask,
    cancelTaskSubmit,
    removeTutor,
    setTaskAllowView,
    deleteTaskFile,
    deleteTaskSolution,
  }
}

export type TaskDetailsModel = ReturnType<typeof useTaskDetails>
