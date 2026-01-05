import listOrganizationService from '@/services/organizations/list'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const list: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const organizations = await listOrganizationService(req.ctx!)

    next({
      success: true,
      message: 'Organizations list',
      data: { organizations },
    })
  }
)
