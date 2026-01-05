import destroyService from '@/services/organizations/destroy'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const destroy: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    await destroyService(req.ctx!)

    next({
      success: true,
      message: 'Organization deleted successfully',
    })
  }
)
