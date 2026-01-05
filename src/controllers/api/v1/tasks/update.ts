import updateTaskService from '@/services/tasks/update'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const update: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const task = await updateTaskService(req.ctx!)

    next({
      success: true,
      message: 'Task updated successfully',
      data: { task },
    })
  }
)
