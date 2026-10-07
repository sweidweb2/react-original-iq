import { useCallback, useEffect, useRef, useState } from 'react'

export type RemoteIdle = { status: 'idle' }
export type RemoteLoading = { status: 'loading' }
export type RemoteSuccess<T> = { status: 'success'; data: T }
export type RemoteError = { status: 'error'; error: unknown }

export type RemoteState<T> = RemoteIdle | RemoteLoading | RemoteSuccess<T> | RemoteError

type UseRemoteDataOptions = {
  /** When false, skip the initial fetch. Default true. */
  enabled?: boolean
}

/**
 * Lightweight server-data fetch for a screen/feature.
 * Keeps loading/error/data local — do not dump results into Zustand.
 * A dedicated cache library (e.g. TanStack Query) stays TBD until needed.
 */
export function useRemoteData<T>(load: () => Promise<T>, options: UseRemoteDataOptions = {}) {
  const { enabled = true } = options
  const [state, setState] = useState<RemoteState<T>>({ status: 'idle' })
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  const refetch = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const data = await loadRef.current()
      setState({ status: 'success', data })
    } catch (error) {
      setState({ status: 'error', error })
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refetch()
  }, [enabled, refetch])

  return {
    ...state,
    refetch,
    isLoading: state.status === 'loading' || state.status === 'idle',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    error: state.status === 'error' ? state.error : undefined,
  }
}
