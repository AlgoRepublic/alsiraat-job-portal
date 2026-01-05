import { checkPermissions } from '@/utils/auth'
import TaskCategory from '@/models/taskcategory'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { RequestContext } from '@/types/common'
import { ITaskCategory } from '@/types/models'
import Joi from 'joi'

const findById = async (_id: string): Promise<ITaskCategory> => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
  })

  const { error } = await joiValidate(schema, { _id })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const taskCategory = await TaskCategory.findById(_id).exec()

  if (!taskCategory) throw new CustomError('Task category not found')

  return taskCategory
}

export default async (ctx: RequestContext): Promise<ITaskCategory> => {
  await checkPermissions(ctx, ['category.update'])
  const { _id, name, description, isGlobal, organization } = ctx.request.data

  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
    name: Joi.string().optional().trim(),
    description: Joi.string().optional().allow(null, ''),
    isGlobal: Joi.boolean().optional(),
    organization: Joi.string().hex().length(24).optional().allow(null),
  })

  const { error } = await joiValidate(schema, {
    _id,
    name,
    description,
    isGlobal,
    organization,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const taskCategory = await findById(_id)

  if (name) {
    taskCategory.name = name.trim()
  }
  if (description !== undefined) {
    taskCategory.description = description || null
  }
  if (isGlobal !== undefined) {
    taskCategory.isGlobal = isGlobal
    if (isGlobal) {
      taskCategory.organization = null
    } else if (organization) {
      taskCategory.organization = organization as any
    }
  } else if (organization !== undefined) {
    taskCategory.organization = organization ? (organization as any) : null
  }

  await taskCategory.save()

  return (await TaskCategory.findById(taskCategory._id)
    .select((TaskCategory as any).publicFields())
    .exec()) as ITaskCategory
}
