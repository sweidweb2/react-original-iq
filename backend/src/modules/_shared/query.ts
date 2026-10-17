export function nowIso(): string {
  return new Date().toISOString()
}

/** Drop characters that would break a PostgREST `or` filter or act as LIKE wildcards. */
export function sanitizeSearch(search: string): string | null {
  const safe = search.replace(/[%_\\,()]/g, '').trim()
  return safe || null
}

/** `a.ilike.%term%,b.ilike.%term%` for `.or(...)`; null when nothing searchable is left. */
export function ilikeAny(fields: readonly string[], search: string): string | null {
  const safe = sanitizeSearch(search)
  if (!safe) return null
  return fields.map((field) => `${field}.ilike.%${safe}%`).join(',')
}

/** Postgres `unique_violation` (also thrown by in-memory repositories). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505'
}
