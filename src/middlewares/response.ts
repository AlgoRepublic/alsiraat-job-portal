import { Response, NextFunction } from 'express'
import { CustomError } from '@/utils/error'
import { jsonResponse } from '@/utils/response'
import { logError } from '@/utils/log'
import { ExpressRequest } from '@/types/common'

export default (
  err: any,
  _req: ExpressRequest,
  res: Response,
  _next: NextFunction
): Response => {
  let success = false
  let message = 'Internal server error'
  let statusCode = 500
  let data = null

  if (err instanceof CustomError) {
    message = err?.message ?? message
    statusCode = err?.statusCode ?? statusCode
    logError(err)
  } else if (err instanceof Error) {
    logError(err)
  } else if (err && typeof err === 'object') {
    success = err?.success ?? success
    message = err?.message ?? message
    statusCode = success ? 200 : 400
    data = err?.data ?? data
  }

  return jsonResponse(res, success, message, data, statusCode)
}
