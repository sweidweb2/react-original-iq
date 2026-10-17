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
  downloadTaskZip,
  type FileDownload,
  getTask,
  getTaskFileDownloadUrl,
  getTaskSolutionDownloadUrl,
  removeTutor,
  setTaskAllowView,
  submitTask,
  type Task,
  TASK_UPLOAD_MAX_BYTES,
  type TaskDetail,
  taskStatusLabel,
  type TaskType,
  updateTask,
  updateTaskPrice,
  uploadTaskFile,
  uploadTaskSolution,
} from '@/services/tasks'
import { toastApiError, toastInvalid, toastSuccess } from '@/services/toast'
import { listUsers, type ManagedUser, userDisplayName } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

import { formatFileSize, storedFileName } from './taskDetailsFormat'

export type UploadTarget = 'documents' | 'solutions'

/** Toast copy for one action: success title, failure title, optional success detail line. */
type ActionCopy<T> = {
  success: string
  failure: string
  detail?: (result: T) => string | undefined
}

export type UploadProgress = {
  fileName: string
  fileIndex: number
  fileCount: number
  percent: number
}

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [zipping, setZipping] = useState<UploadTarget | null>(null)
  const [isActing, setIsActing] = useState(false)

  /** Full-page reload (initial load / error retry). Actions update their own slice instead. */
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const syncForms = useCallback((next: Task) => {
    setPriceValue(String(next.price))
    setEditTopic(next.topic ?? '')
    setEditType(next.type ?? 'assignment')
    setEditCategory(next.category ?? '')
    setEditDescription(next.description ?? '')
    setSelectedCoordId(next.coordinatorId ?? '')
    setSelectedTutorId(next.tutorId ?? '')
  }, [])

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
        syncForms(detail)
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
  }, [taskId, reloadKey, syncForms])

  /** Merge a task row returned by a mutation; keeps files/solutions as-is. */
  function applyTask(updated: Task) {
    setTask((prev) => (prev ? { ...prev, ...updated } : prev))
    syncForms(updated)
  }

  async function refreshRevisions() {
    try {
      const result = await listRevisionsForTask(taskId)
      setRevisions(result.data)
    } catch (err) {
      toastApiError(err, "Revision saved, but the list couldn't refresh")
    }
  }

  useEffect(() => {
    if (!isStaff) return
    let cancelled = false
    setTutorsLoading(true)
    listUsers({ page: 1, limit: 100, role: 'tutor', status: 'ACTIVE' })
      .then((result) => {
        if (!cancelled) setTutors(result.data)
      })
      .catch((err: unknown) => {
        if (!cancelled) toastApiError(err, "Couldn't load the tutor list")
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
        if (!cancelled) toastApiError(err, "Couldn't load the coordinator list")
      })
      .finally(() => {
        if (!cancelled) setCoordinatorsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  async function runAction<T>(
    copy: ActionCopy<T>,
    action: () => Promise<T>,
    onSuccess: (result: T) => void | Promise<void>,
  ): Promise<boolean> {
    setIsActing(true)
    try {
      const result = await action()
      await onSuccess(result)
      toastSuccess(copy.success, copy.detail?.(result))
      return true
    } catch (err) {
      toastApiError(err, copy.failure)
      return false
    } finally {
      setIsActing(false)
    }
  }

  /** Task mutations: merges the returned row and mentions the new status when it changed. */
  function runTaskAction(
    copy: Omit<ActionCopy<Task>, 'detail'> & { detail?: string },
    action: () => Promise<Task>,
  ) {
    const previousStatus = task?.status
    return runAction(
      {
        ...copy,
        detail: (updated) => {
          const statusLine =
            updated.status !== previousStatus
              ? `Status is now “${taskStatusLabel(updated.status)}”.`
              : undefined
          return [copy.detail, statusLine].filter(Boolean).join(' ') || undefined
        },
      },
      action,
      applyTask,
    )
  }

  function onRemoveFile(fileId: string) {
    if (!task) return
    const target = task.files.find((file) => file.id === fileId)
    const name = target ? storedFileName(target, 'Document') : 'Document'
    void runAction(
      { success: 'Document removed', failure: `Couldn't remove “${name}”`, detail: () => name },
      () => deleteTaskFile(task.id, fileId),
      () =>
        setTask((prev) =>
          prev ? { ...prev, files: prev.files.filter((file) => file.id !== fileId) } : prev,
        ),
    )
  }

  function onRemoveSolution(solutionId: string) {
    if (!task) return
    const target = task.solutions.find((item) => item.id === solutionId)
    const name = target ? storedFileName(target, 'Solution') : 'Solution'
    void runAction(
      { success: 'Solution removed', failure: `Couldn't remove “${name}”`, detail: () => name },
      () => deleteTaskSolution(task.id, solutionId),
      () =>
        setTask((prev) =>
          prev
            ? { ...prev, solutions: prev.solutions.filter((item) => item.id !== solutionId) }
            : prev,
        ),
    )
  }

  async function onSavePrice(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    const price = Number(priceValue)
    if (Number.isNaN(price) || price < 0) {
      toastInvalid('Invalid price', 'Enter a number of 0 or more, e.g. 49.99.')
      return
    }
    const ok = await runTaskAction(
      {
        success: 'Price updated',
        failure: "Couldn't update the price",
        detail: `$${task.price.toFixed(2)} → $${price.toFixed(2)}.`,
      },
      () => updateTaskPrice(task.id, price),
    )
    if (ok) setPriceOpen(false)
  }

  async function onCreateRevision(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    const title = revisionTitle.trim()
    const ok = await runAction(
      {
        success: 'Revision created',
        failure: "Couldn't create the revision",
        detail: () => (title ? `“${title}” is now open.` : 'A new revision is now open.'),
      },
      () =>
        createRevision(task.id, {
          title: title || undefined,
          description: revisionDescription.trim() || undefined,
        }),
      refreshRevisions,
    )
    if (!ok) return
    setRevisionOpen(false)
    setRevisionTitle('')
    setRevisionDescription('')
  }

  async function onAssignTutor(event: FormEvent) {
    event.preventDefault()
    if (!task || !selectedTutorId) return
    const tutor = tutors.find((item) => item.id === selectedTutorId)
    const tutorName = tutor ? userDisplayName(tutor) : null
    await runTaskAction(
      {
        success: 'Tutor assigned',
        failure: "Couldn't assign the tutor",
        detail: tutorName ? `${tutorName} is now working on this task.` : undefined,
      },
      () => assignTutor(task.id, selectedTutorId),
    )
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!task) return
    const ok = await runTaskAction(
      { success: 'Task details saved', failure: "Couldn't save the task details" },
      () =>
        updateTask(task.id, {
          topic: editTopic.trim(),
          type: editType,
          category: editCategory.trim(),
          description: editDescription.trim(),
        }),
    )
    if (ok) setEditOpen(false)
  }

  async function onChangeCoordinator(event: FormEvent) {
    event.preventDefault()
    if (!task || !selectedCoordId) return
    const coordinator = coordinators.find((item) => item.id === selectedCoordId)
    const coordName = coordinator ? userDisplayName(coordinator) : null
    await runTaskAction(
      {
        success: 'Coordinator changed',
        failure: "Couldn't change the coordinator",
        detail: coordName ? `${coordName} now coordinates this task.` : undefined,
      },
      () => changeCoordinator(task.id, selectedCoordId),
    )
  }

  async function onDeleteTask() {
    if (!task) return
    if (!window.confirm('Delete this task permanently?')) return
    setIsActing(true)
    try {
      await deleteTask(task.id)
      toastSuccess('Task deleted', task.topic ? `“${task.topic}” was removed.` : undefined)
      navigate(`${portalBase}/tasks`)
    } catch (err) {
      toastApiError(err, "Couldn't delete this task")
    } finally {
      setIsActing(false)
    }
  }

  async function onUpload(target: UploadTarget, files: File[]) {
    if (!task || files.length === 0) return
    const tooLarge = files.find((file) => file.size > TASK_UPLOAD_MAX_BYTES)
    if (tooLarge) {
      toastInvalid(
        'File too large',
        `“${tooLarge.name}” is ${formatFileSize(tooLarge.size)}. The limit is 25 MB.`,
      )
      return
    }
    const upload = async (file: File, onProgress: (loadedBytes: number) => void) => {
      if (target === 'documents') {
        const created = await uploadTaskFile(task.id, file, onProgress)
        setTask((prev) => (prev ? { ...prev, files: [...prev.files, created] } : prev))
      } else {
        const created = await uploadTaskSolution(task.id, file, onProgress)
        setTask((prev) => (prev ? { ...prev, solutions: [...prev.solutions, created] } : prev))
      }
    }
    const section = target === 'documents' ? 'Documents' : 'Solutions'
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0) || 1
    let doneBytes = 0
    setUploadTarget(target)
    setIsActing(true)
    let uploaded = 0
    let current: File | undefined
    try {
      for (const [index, file] of files.entries()) {
        current = file
        const report = (loadedBytes: number) =>
          setUploadProgress({
            fileName: file.name,
            fileIndex: index + 1,
            fileCount: files.length,
            percent: Math.min(100, Math.round(((doneBytes + loadedBytes) / totalBytes) * 100)),
          })
        report(0)
        await upload(file, report)
        doneBytes += file.size
        uploaded += 1
      }
      toastSuccess(
        uploaded === 1 ? 'File uploaded' : `${uploaded} files uploaded`,
        uploaded === 1 ? `“${files[0]?.name}” added to ${section}.` : `Added to ${section}.`,
      )
    } catch (err) {
      const remaining = files.length - uploaded
      toastApiError(
        err,
        current ? `Couldn't upload “${current.name}”` : `Couldn't upload to ${section}`,
      )
      if (uploaded > 0 && remaining > 0) {
        toast.info(`${uploaded} of ${files.length} files were uploaded before the error.`)
      }
    } finally {
      setIsActing(false)
      setUploadTarget(null)
      setUploadProgress(null)
    }
  }

  async function openDownload(request: () => Promise<FileDownload>) {
    try {
      const { url } = await request()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toastApiError(err, "Couldn't open the file")
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

  /** Returns true when the zip downloaded, so callers can clear their selection. */
  async function downloadZip(kind: UploadTarget, ids?: string[]): Promise<boolean> {
    if (!task) return false
    setZipping(kind)
    try {
      await downloadTaskZip(task.id, kind, ids)
      return true
    } catch (err) {
      toastApiError(
        err,
        `Couldn't download the ${kind === 'documents' ? 'documents' : 'solutions'}`,
      )
      return false
    } finally {
      setZipping(null)
    }
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
    runTaskAction,
    onRemoveFile,
    onRemoveSolution,
    onDeleteTask,
    onSavePrice,
    onCreateRevision,
    onAssignTutor,
    onSaveEdit,
    onChangeCoordinator,
    uploadTarget,
    uploadProgress,
    onUpload,
    onOpenFile,
    onOpenSolution,
    zipping,
    downloadZip,
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
  }
}

export type TaskDetailsModel = ReturnType<typeof useTaskDetails>
