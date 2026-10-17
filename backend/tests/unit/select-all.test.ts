import { describe, expect, it, vi } from 'vitest'

import { selectAllPages } from '../../src/database/select-all.js'

function fakeTable(size: number) {
  const rows = Array.from({ length: size }, (_, index) => ({ id: index }))
  const range = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null,
  }))
  return { range }
}

describe('selectAllPages', () => {
  it('reads past the 1000-row PostgREST cap', async () => {
    const query = fakeTable(2500)
    const rows = await selectAllPages<{ id: number }>(() => query)

    expect(rows).toHaveLength(2500)
    expect(rows.at(-1)).toEqual({ id: 2499 })
    expect(query.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('stops after an exact multiple with one empty page', async () => {
    const query = fakeTable(1000)
    expect(await selectAllPages(() => query)).toHaveLength(1000)
    expect(query.range).toHaveBeenCalledTimes(2)
  })

  it('throws the query error', async () => {
    const failure = { message: 'boom' }
    await expect(
      selectAllPages(() => ({ range: async () => ({ data: null, error: failure }) })),
    ).rejects.toBe(failure)
  })
})
