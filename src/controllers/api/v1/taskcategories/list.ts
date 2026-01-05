import listTaskCategoryService from '@/services/taskcategories/list'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const list: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const taskCategories = await listTaskCategoryService(req.ctx!)

    next({
      success: true,
      message: 'Task categories list',
      data: { taskCategories },
    })
  }
)
