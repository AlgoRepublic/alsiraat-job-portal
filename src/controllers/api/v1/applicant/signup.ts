import signupService from '@/services/applicant/signup'
import { asyncMiddleware } from '@/middlewares/async'
import { ExpressRequest, ExpressHandler } from '@/types/common'

export const signup: ExpressHandler = asyncMiddleware(
  async (req: ExpressRequest, _res, next) => {
    const result = await signupService(req.ctx!)

    next({
      success: true,
      message: 'Signup successful',
      data: result,
    })
  }
)
