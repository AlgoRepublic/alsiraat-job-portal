import { checkPermissions } from '@/utils/auth'
import Application from '@/models/application'
import Task from '@/models/task'
import Profile from '@/models/profile'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { RequestContext } from '@/types/common'
import { IApplication } from '@/types/models'
import Joi from 'joi'

const findById = async (_id: string): Promise<IApplication> => {
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

export default async (ctx: RequestContext): Promise<IApplication> => {
  await checkPermissions(ctx, ['application.view'])
  const { _id } = ctx.request.data

  const application = await findById(_id)

  const taskPublicFields = (Task as any).publicFields() || []
  const profilePublicFields = (Profile as any).publicFields() || []
  const applicationPublicFields = (Application as any).publicFields() || []

  return (await Application.findById(application._id)
    .populate({
      path: 'task',
      select: taskPublicFields.join(' '),
    })
    .populate({
      path: 'applicant',
      select: profilePublicFields.join(' '),
    })
    .select(applicationPublicFields.join(' '))
    .exec()) as IApplication
}
