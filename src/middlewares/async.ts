import { Response, NextFunction } from 'express'
import { attachRequestContext } from '@/utils/context'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const asyncMiddleware = (handler: ExpressHandler) => {
  return async (
    req: ExpressRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await attachRequestContext(req)
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}
