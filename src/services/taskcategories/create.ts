import { checkPermissions } from '@/utils/auth'
import TaskCategory from '@/models/taskcategory'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { setCreatedBy } from '@/utils/createdby'
import { RequestContext } from '@/types/common'
import { ITaskCategory } from '@/types/models'
import Joi from 'joi'

export default async (ctx: RequestContext): Promise<ITaskCategory> => {
  await checkPermissions(ctx, ['category.create'])
  const { name, description, isGlobal, organization } = ctx.request.data

  const schema = Joi.object({
    name: Joi.string().required().trim(),
    description: Joi.string().optional().allow(null, ''),
    isGlobal: Joi.boolean().optional(),
    organization: Joi.string().hex().length(24).optional().allow(null),
  })

  const { error } = await joiValidate(schema, {
    name,
    description,
    isGlobal,
    organization,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  // Check if category with same name already exists
  const existingQuery: any = isGlobal
    ? { name: name.trim(), isGlobal: true, deletedAt: null }
    : { name: name.trim(), organization, deletedAt: null }

  const existing = await TaskCategory.findOne(existingQuery).exec()

  if (existing) {
    throw new CustomError(
      `Task category with name "${name}" already exists`,
      400
    )
  }

  const taskCategory = await TaskCategory.create({
    name: name.trim(),
    description: description || null,
    isGlobal: isGlobal || false,
    organization: isGlobal
      ? null
      : organization || ctx.auth.profile?.organization || null,
  })

  await setCreatedBy(taskCategory, ctx)

  return (await TaskCategory.findById(taskCategory._id)
    .select((TaskCategory as any).publicFields())
    .exec()) as ITaskCategory
}
