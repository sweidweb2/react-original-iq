import { useEffect, useState } from 'react'

import { getTask } from '@/services/tasks'

/** Best-effort task label for breadcrumbs; resolves to `null` while loading or on failure. */
export function useTaskTopic(taskId: string): string | null {
  const [topic, setTopic] = useState<{ taskId: string; value: string | null } | null>(null)

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    getTask(taskId)
      .then((task) => {
        if (!cancelled) setTopic({ taskId, value: task.topic })
      })
      .catch(() => {
        if (!cancelled) setTopic({ taskId, value: null })
      })
    return () => {
      cancelled = true
    }
  }, [taskId])

  return topic?.taskId === taskId ? topic.value : null
}
