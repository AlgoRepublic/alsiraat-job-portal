import showApplicationService from '@/services/applications/show'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const show: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const application = await showApplicationService(req.ctx!)

    next({
      success: true,
      message: 'Application details',
      data: { application },
    })
  }
)
