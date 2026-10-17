import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { toast } from '@/components/ui/toast'
import { createRevision, listRevisionsForTask, type RevisionSession } from '@/services/revisions'
import {
  activateTask,
  approveTask,
  assignTutor,
  cancelTask,
  cancelTaskSubmit,
  changeCoordinator,
  deleteTask,
  deleteTaskFile,
  deleteTaskSolution,
  disapproveTask,
  type FileDownload,
  getTask,
  getTaskFileDownloadUrl,
  getTaskSolutionDownloadUrl,
  removeTutor,
  setTaskAllowView,
  submitTask,
  TASK_UPLOAD_MAX_BYTES,
  type TaskDetail,
  type TaskType,
  updateTask,
  updateTaskPrice,
  uploadTaskFile,
  uploadTaskSolution,
} from '@/services/tasks'
import { toastApiError } from '@/services/toast'
import { listUsers, type ManagedUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

export type UploadTarget = 'documents' | 'solutions'

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
  const [editOpen, setEditOpen] = useState(false)
  const [tutors, setTutors] = useState<ManagedUser[]>([])
  const [tutorsLoading, setTutorsLoading] = useState(false)
  const [coordinators, setCoordinators] = useState<ManagedUser[]>([])
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(false)
  const [selectedTutorId, setSelectedTutorId] = useState('')
  const [selectedCoordId, setSelectedCoordId] = useState('')
  const [editTopic, setEditTopic] = useState('')
  const [editType, setEditType] = useState<TaskType>('assignment')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)
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
        setSelectedTutorId(detail.tutorId ?? '')
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
    if (!isStaff) return
    let cancelled = false
    setTutorsLoading(true)
    listUsers({ page: 1, limit: 100, role: 'tutor', status: 'ACTIVE' })
      .then((result) => {
        if (!cancelled) setTutors(result.data)
      })
      .catch((err: unknown) => {
        if (!cancelled) toastApiError(err, 'Could not load tutors')
      })
      .finally(() => {
        if (!cancelled) setTutorsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isStaff])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setCoordinatorsLoading(true)
    listUsers({ page: 1, limit: 100, role: 'coordinator', status: 'ACTIVE' })
      .then((result) => {
        if (!cancelled) setCoordinators(result.data)
      })
      .catch((err: unknown) => {
        if (!cancelled) toastApiError(err, 'Could not load coordinators')
      })
      .finally(() => {
        if (!cancelled) setCoordinatorsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

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

  async function onUpload(target: UploadTarget, files: File[]) {
    if (!task || files.length === 0) return
    const tooLarge = files.find((file) => file.size > TASK_UPLOAD_MAX_BYTES)
    if (tooLarge) {
      toast.error(`${tooLarge.name} is larger than 25 MB`)
      return
    }
    const upload = target === 'documents' ? uploadTaskFile : uploadTaskSolution
    const noun = target === 'documents' ? 'File' : 'Solution'
    setUploadTarget(target)
    setIsActing(true)
    let uploaded = 0
    try {
      for (const file of files) {
        await upload(task.id, file)
        uploaded += 1
      }
      toast.success(uploaded === 1 ? `${noun} uploaded` : `${uploaded} files uploaded`)
    } catch (err) {
      toastApiError(err, 'Upload failed')
    } finally {
      setIsActing(false)
      setUploadTarget(null)
      if (uploaded > 0) reload()
    }
  }

  async function openDownload(request: () => Promise<FileDownload>) {
    try {
      const { url } = await request()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toastApiError(err, 'Could not open file')
    }
  }

  function onOpenFile(fileId: string) {
    if (!task) return
    void openDownload(() => getTaskFileDownloadUrl(task.id, fileId))
  }

  function onOpenSolution(solutionId: string) {
    if (!task) return
    void openDownload(() => getTaskSolutionDownloadUrl(task.id, solutionId))
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
    uploadTarget,
    onUpload,
    onOpenFile,
    onOpenSolution,
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
    editOpen,
    setEditOpen,
    tutors,
    tutorsLoading,
    coordinators,
    coordinatorsLoading,
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
