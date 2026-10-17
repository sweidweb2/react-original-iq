import { waitUntil } from '@vercel/functions'

import { reportError } from '../errors/report-error.js'

const pending = new Set<Promise<void>>()

/**
 * Runs `task` without holding up the response. On Vercel the function stays alive until it
 * settles (`waitUntil`); elsewhere it simply runs on the event loop. Never throws.
 */
export function runInBackground(source: string, task: () => Promise<unknown>): void {
  const promise: Promise<void> = Promise.resolve()
    .then(task)
    .then(
      () => undefined,
      (error: unknown) => reportError(error, { source }),
    )
    .finally(() => pending.delete(promise))
  pending.add(promise)
  waitUntil(promise)
}

/** Resolves once every queued background task (including ones they queue) has settled. */
export async function flushBackgroundTasks(): Promise<void> {
  while (pending.size > 0) {
    await Promise.all([...pending])
  }
}
