import type { SupabaseClient } from '@supabase/supabase-js'

/** PostgREST caps a single response at 1000 rows by default. */
const READ_CHUNK_SIZE = 1000

/** Reads every row of `table` in key order, one PostgREST page at a time. */
export async function selectAllRows<T>(
  client: SupabaseClient,
  table: string,
  columns = '*',
  orderBy: readonly string[] = ['id'],
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += READ_CHUNK_SIZE) {
    let query = client.from(table).select(columns)
    for (const column of orderBy) {
      query = query.order(column, { ascending: true })
    }
    const { data, error } = await query.range(from, from + READ_CHUNK_SIZE - 1)
    if (error) throw error
    const chunk = (data ?? []) as unknown as T[]
    rows.push(...chunk)
    if (chunk.length < READ_CHUNK_SIZE) break
  }
  return rows
}
