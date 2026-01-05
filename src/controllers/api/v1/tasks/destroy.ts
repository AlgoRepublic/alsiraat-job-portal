import destroyTaskService from '@/services/tasks/destroy'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const destroy: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    await destroyTaskService(req.ctx!)

    next({
      success: true,
      message: 'Task deleted successfully',
      data: null,
    })
  }
)
