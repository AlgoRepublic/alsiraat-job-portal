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
  await checkPermissions(ctx, ['category.view'])
  const { _id } = ctx.request.data

  const taskCategory = await findById(_id)

  return (await TaskCategory.findById(taskCategory._id)
    .select((TaskCategory as any).publicFields())
    .exec()) as ITaskCategory
}
