import { merge } from 'lodash'
import { logInfo } from './log'
import { tryLoginByToken } from './auth'
import { RequestContext, ExpressRequest } from '@/types/common'

async function sanitizeCtx(obj: any): Promise<any> {
  if (Array.isArray(obj)) {
    const list = []

    for (let i = 0; i < obj.length; i++) {
      list.push(await sanitizeCtx(obj[i]))
    }

    return list
  }

  if (obj && typeof obj === 'object') {
    if (obj.data && Buffer.isBuffer(obj.data)) {
      const { size } = obj
      const sizeMB = (size / (1024 * 1024)).toFixed(2)

      const { data, mv, ...rest } = obj
      return {
        ...rest,
        mv: '[Function hidden]',
        data: '[Buffer hidden]',
        sizeMB: `${sizeMB} MB`,
      }
    }

    const sanitized: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      sanitized[key] = await sanitizeCtx(obj[key])
    }
    return sanitized
  }

  return obj
}

export const attachRequestContext = async (
  req: ExpressRequest
): Promise<RequestContext> => {
  const token = req.headers.authorization?.split(' ')?.pop() || null
  const profileId = (req.headers['x-profile-id'] as string) || null

  const loginInfo = await tryLoginByToken(token, profileId)

  const ctx: RequestContext = {
    auth: {
      ...loginInfo,
    },
    request: {
      data: merge(
        {},
        req.params ? { ...req.params } : {},
        req.query ? { ...req.query } : {},
        req.body ? { ...req.body } : {},
        req.files ? { ...req.files } : {}
      ),
    },
  }

  const sanitizedCtx = await sanitizeCtx({
    request: {
      data: ctx.request.data,
    },
  })

  logInfo(JSON.stringify(ctx.auth, null, 2))
  logInfo(JSON.stringify(sanitizedCtx, null, 2))

  req.ctx = ctx

  return ctx
}
