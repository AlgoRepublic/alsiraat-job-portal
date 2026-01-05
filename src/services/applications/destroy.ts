import { checkPermissions } from '@/utils/auth'
import Application from '@/models/application'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { RequestContext } from '@/types/common'
import Joi from 'joi'

const findById = async (_id: string) => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
  })

  const { error } = await joiValidate(schema, { _id })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const application = await Application.findById(_id).exec()

  if (!application) throw new CustomError('Application not found')

  return application
}

export default async (ctx: RequestContext): Promise<boolean> => {
  await checkPermissions(ctx, ['application.delete'])
  const { _id } = ctx.request.data

  const application = await findById(_id)

  await application.softDelete()

  return true
}
