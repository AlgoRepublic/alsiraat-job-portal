import destroyTaskCategoryService from '@/services/taskcategories/destroy'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const destroy: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    await destroyTaskCategoryService(req.ctx!)

    next({
      success: true,
      message: 'Task category deleted successfully',
      data: null,
    })
  }
)
