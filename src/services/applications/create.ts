import { checkPermissions } from '@/utils/auth'
import Application from '@/models/application'
import Task from '@/models/task'
import Profile from '@/models/profile'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { setCreatedBy } from '@/utils/createdby'
import { saveFile } from '@/utils/storage'
import { RequestContext } from '@/types/common'
import { IApplication } from '@/types/models'
import Joi from 'joi'

export default async (ctx: RequestContext): Promise<IApplication> => {
  await checkPermissions(ctx, ['application.create'])
  const { task, applicant, coverLetter, resume, availability, organization } =
    ctx.request.data

  const schema = Joi.object({
    task: Joi.string().hex().length(24).required(),
    applicant: Joi.string().hex().length(24).optional(),
    coverLetter: Joi.string().optional().allow(null, ''),
    resume: Joi.object().optional(),
    availability: Joi.string().optional().allow(null, ''),
    organization: Joi.string().hex().length(24).optional(),
  })

  const { error } = await joiValidate(schema, {
    task,
    applicant,
    coverLetter,
    resume,
    availability,
    organization,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  // Validate task exists
  const taskDoc = await Task.findById(task).exec()
  if (!taskDoc) {
    throw new CustomError('Task not found', 400)
  }

  // Use provided applicant or current user's profile
  const applicantId = applicant || ctx.auth.profile?._id
  if (!applicantId) {
    throw new CustomError('Applicant is required', 400)
  }

  // Validate applicant profile exists
  const applicantProfile = await Profile.findById(applicantId).exec()
  if (!applicantProfile) {
    throw new CustomError('Applicant profile not found', 400)
  }

  // Check if application already exists
  const existingApplication = await Application.findOne({
    task,
    applicant: applicantId,
    deletedAt: null,
  }).exec()

  if (existingApplication) {
    throw new CustomError('Application already exists for this task', 400)
  }

  const orgId =
    organization || ctx.auth.profile?.organization || taskDoc.organization
  if (!orgId) {
    throw new CustomError('Organization is required', 400)
  }

  let resumePath = null
  if (resume) {
    resumePath = await saveFile(resume, 'models/applications/resume')
  }

  const application = await Application.create({
    organization: orgId,
    task,
    applicant: applicantId,
    coverLetter: coverLetter || null,
    resumePath,
    availability: availability || null,
    status: 'submitted',
  })

  await setCreatedBy(application, ctx)

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
