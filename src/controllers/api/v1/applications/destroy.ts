import destroyApplicationService from '@/services/applications/destroy'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const destroy: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    await destroyApplicationService(req.ctx!)

    next({
      success: true,
      message: 'Application deleted successfully',
      data: null,
    })
  }
)
