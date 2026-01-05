import { checkPermissions } from '@/utils/auth'
import Organization from '@/models/organization'
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

  const organization = await Organization.findById(_id).exec()

  if (!organization) throw new CustomError('Organization not found')

  return organization
}

export default async (ctx: RequestContext): Promise<boolean> => {
  await checkPermissions(ctx, ['organization.delete'])
  const { _id } = ctx.request.data

  const organization = await findById(_id)

  await organization.softDelete()

  return true
}
