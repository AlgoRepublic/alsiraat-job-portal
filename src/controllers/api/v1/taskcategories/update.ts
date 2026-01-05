import updateTaskCategoryService from '@/services/taskcategories/update'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const update: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const taskCategory = await updateTaskCategoryService(req.ctx!)

    next({
      success: true,
      message: 'Task category updated successfully',
      data: { taskCategory },
    })
  }
)
