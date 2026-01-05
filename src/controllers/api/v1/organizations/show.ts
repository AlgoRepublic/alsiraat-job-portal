import showService from '@/services/organizations/show'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const show: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const organization = await showService(req.ctx!)

    next({
      success: true,
      message: 'Organization details',
      data: { organization },
    })
  }
)
