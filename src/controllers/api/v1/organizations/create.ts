import createService from '@/services/organizations/create'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const create: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const organization = await createService(req.ctx!)

    next({
      success: true,
      message: 'Organization created successfully',
      data: { organization },
    })
  }
)
