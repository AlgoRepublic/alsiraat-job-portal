import createTaskCategoryService from '@/services/taskcategories/create'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const create: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const taskCategory = await createTaskCategoryService(req.ctx!)

    next({
      success: true,
      message: 'Task category created successfully',
      data: { taskCategory },
    })
  }
)
