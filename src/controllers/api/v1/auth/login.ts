import loginService from '@/services/auth/login'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const login: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const result = await loginService(req.ctx!)

    next({
      success: true,
      message: 'Login successful',
      data: result,
    })
  }
)
