import showTaskCategoryService from '@/services/taskcategories/show'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const show: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const taskCategory = await showTaskCategoryService(req.ctx!)

    next({
      success: true,
      message: 'Task category details',
      data: { taskCategory },
    })
  }
)
