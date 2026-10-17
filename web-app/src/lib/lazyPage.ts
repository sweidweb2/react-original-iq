import { type ComponentType, lazy, type LazyExoticComponent } from 'react'

/** `React.lazy` for a named export, so route pages keep their named exports. */
export function lazyPage<K extends string, M extends Record<K, ComponentType>>(
  load: () => Promise<M>,
  name: K,
): LazyExoticComponent<M[K]> {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}
