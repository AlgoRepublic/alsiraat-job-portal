import updateService from '@/services/organizations/update'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const update: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const organization = await updateService(req.ctx!)

    next({
      success: true,
      message: 'Organization updated successfully',
      data: { organization },
    })
  }
)
