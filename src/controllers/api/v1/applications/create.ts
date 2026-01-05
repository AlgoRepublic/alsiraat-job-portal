import createApplicationService from '@/services/applications/create'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const create: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const application = await createApplicationService(req.ctx!)

    next({
      success: true,
      message: 'Application submitted successfully',
      data: { application },
    })
  }
)
