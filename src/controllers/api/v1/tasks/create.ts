import createTaskService from '@/services/tasks/create'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const create: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const task = await createTaskService(req.ctx!)

    next({
      success: true,
      message: 'Task created successfully',
      data: { task },
    })
  }
)
