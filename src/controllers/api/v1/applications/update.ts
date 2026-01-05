import updateApplicationService from '@/services/applications/update'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const update: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const application = await updateApplicationService(req.ctx!)

    next({
      success: true,
      message: 'Application updated successfully',
      data: { application },
    })
  }
)
