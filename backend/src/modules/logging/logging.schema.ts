import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const listLogsQuerySchema = paginationQuerySchema

export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>
