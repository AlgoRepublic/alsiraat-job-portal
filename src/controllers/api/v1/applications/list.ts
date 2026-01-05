import listApplicationService from '@/services/applications/list'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const list: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const applications = await listApplicationService(req.ctx!)

    next({
      success: true,
      message: 'Applications list',
      data: { applications },
    })
  }
)
