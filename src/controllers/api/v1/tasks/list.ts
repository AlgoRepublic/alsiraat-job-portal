import listTaskService from '@/services/tasks/list'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const list: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const tasks = await listTaskService(req.ctx!)

    next({
      success: true,
      message: 'Tasks list',
      data: { tasks },
    })
  }
)
