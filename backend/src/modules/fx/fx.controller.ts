import type { RequestHandler } from 'express'

import { respond } from '../../middleware/respond.js'
import type { ConvertQuery, RatesQuery } from './fx.schema.js'
import type { FxService } from './fx.service.js'

export type FxController = {
  getRates: RequestHandler
  convert: RequestHandler
}

export function createFxController(service: FxService): FxController {
  return {
    getRates: respond(200, (req) => service.getRates((req.query as unknown as RatesQuery).base)),
    convert: respond(200, (req) => service.convert(req.query as unknown as ConvertQuery)),
  }
}
