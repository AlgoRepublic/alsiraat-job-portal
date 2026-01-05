import showTaskService from '@/services/tasks/show'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const show: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const task = await showTaskService(req.ctx!)

    next({
      success: true,
      message: 'Task details',
      data: { task },
    })
  }
)
