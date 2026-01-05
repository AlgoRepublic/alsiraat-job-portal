import { checkPermissions } from '@/utils/auth'
import Task from '@/models/task'
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

  const task = await Task.findById(_id).exec()

  if (!task) throw new CustomError('Task not found')

  return task
}

export default async (ctx: RequestContext): Promise<boolean> => {
  await checkPermissions(ctx, ['task.delete'])
  const { _id } = ctx.request.data

  const task = await findById(_id)

  await task.softDelete()

  return true
}
