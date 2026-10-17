export type ListMeta = {
  page: number
  limit: number
  total: number
}

/** Paginated list response body: `{ data, meta: { page, limit, total } }`. */
export type ListResult<T> = {
  data: T[]
  meta: ListMeta
}

export function toListResult<T>(
  data: T[],
  total: number,
  query: { page: number; limit: number },
): ListResult<T> {
  return { data, meta: { page: query.page, limit: query.limit, total } }
}
