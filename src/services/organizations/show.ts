import { checkPermissions } from '@/utils/auth'
import Organization from '@/models/organization'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { RequestContext } from '@/types/common'
import { IOrganization } from '@/types/models'
import Joi from 'joi'

const findById = async (_id: string): Promise<IOrganization> => {
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

export default async (ctx: RequestContext): Promise<IOrganization> => {
  await checkPermissions(ctx, ['organization.view'])
  const { _id } = ctx.request.data

  const organization = await findById(_id)

  return (await Organization.findById(organization._id)
    .select((Organization as any).publicFields())
    .exec()) as IOrganization
}
