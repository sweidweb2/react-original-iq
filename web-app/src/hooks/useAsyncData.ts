import { type DependencyList, useCallback, useEffect, useState } from 'react'

/**
 * Loads data on mount (and when `deps` change) with loading/error state and a `reload()`.
 * `isLoading` is only true while nothing has loaded yet, so reloads keep showing stale data.
 * `loader` is read only when `deps` or `reload()` trigger a fetch.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setError(null)
    loader()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls reload deps
  }, [reloadKey, ...deps])

  return { data, isLoading: isFetching && data === null, isFetching, error, reload }
}
