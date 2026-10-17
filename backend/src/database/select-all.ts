import type { SupabaseClient } from '@supabase/supabase-js'

/** PostgREST caps a single response at 1000 rows by default. */
const READ_CHUNK_SIZE = 1000

type RangeableQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
}

/**
 * Reads every row a query matches, one PostgREST page at a time.
 * `buildQuery` must return a fresh, fully ordered query (end with a unique column such as `id`)
 * so pages neither overlap nor skip rows.
 */
export async function selectAllPages<T>(buildQuery: () => RangeableQuery): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += READ_CHUNK_SIZE) {
    const { data, error } = await buildQuery().range(from, from + READ_CHUNK_SIZE - 1)
    if (error) throw error
    const chunk = (data ?? []) as T[]
    rows.push(...chunk)
    if (chunk.length < READ_CHUNK_SIZE) break
  }
  return rows
}

/** Reads every row of `table` in key order, one PostgREST page at a time. */
export async function selectAllRows<T>(
  client: SupabaseClient,
  table: string,
  columns = '*',
  orderBy: readonly string[] = ['id'],
): Promise<T[]> {
  return selectAllPages<T>(() => {
    let query = client.from(table).select(columns)
    for (const column of orderBy) {
      query = query.order(column, { ascending: true })
    }
    return query
  })
}
