import { checkPermissions } from '@/utils/auth'
import Application from '@/models/application'
import Task from '@/models/task'
import Profile from '@/models/profile'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { saveFile } from '@/utils/storage'
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
  await checkPermissions(ctx, ['application.update'])
  const {
    _id,
    coverLetter,
    resume,
    availability,
    status,
    offerSentAt,
    offerExpiresAt,
    offerAcceptedAt,
    offerDeclinedAt,
    shortlistedAt,
    rejectedAt,
    rejectedReason,
    withdrawnAt,
  } = ctx.request.data

  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
    coverLetter: Joi.string().optional().allow(null, ''),
    resume: Joi.object().optional(),
    availability: Joi.string().optional().allow(null, ''),
    status: Joi.string()
      .valid(
        'submitted',
        'shortlisted',
        'offer_sent',
        'offer_accepted',
        'offer_declined',
        'offer_expired',
        'rejected',
        'withdrawn'
      )
      .optional(),
    offerSentAt: Joi.date().optional().allow(null),
    offerExpiresAt: Joi.date().optional().allow(null),
    offerAcceptedAt: Joi.date().optional().allow(null),
    offerDeclinedAt: Joi.date().optional().allow(null),
    shortlistedAt: Joi.date().optional().allow(null),
    rejectedAt: Joi.date().optional().allow(null),
    rejectedReason: Joi.string().optional().allow(null, ''),
    withdrawnAt: Joi.date().optional().allow(null),
  })

  const { error } = await joiValidate(schema, {
    _id,
    coverLetter,
    resume,
    availability,
    status,
    offerSentAt,
    offerExpiresAt,
    offerAcceptedAt,
    offerDeclinedAt,
    shortlistedAt,
    rejectedAt,
    rejectedReason,
    withdrawnAt,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const application = await findById(_id)

  if (coverLetter !== undefined) {
    application.coverLetter = coverLetter || null
  }
  if (resume !== undefined) {
    if (resume) {
      application.resumePath = await saveFile(
        resume,
        'models/applications/resume'
      )
    }
  }
  if (availability !== undefined) {
    application.availability = availability || null
  }
  if (status !== undefined) {
    application.status = status
    // Set related timestamps based on status
    const now = new Date()
    if (status === 'offer_sent' && !application.offerSentAt) {
      application.offerSentAt = now
    } else if (status === 'offer_accepted' && !application.offerAcceptedAt) {
      application.offerAcceptedAt = now
    } else if (status === 'offer_declined' && !application.offerDeclinedAt) {
      application.offerDeclinedAt = now
    } else if (status === 'shortlisted' && !application.shortlistedAt) {
      application.shortlistedAt = now
    } else if (status === 'rejected' && !application.rejectedAt) {
      application.rejectedAt = now
    } else if (status === 'withdrawn' && !application.withdrawnAt) {
      application.withdrawnAt = now
    }
  }
  if (offerSentAt !== undefined) {
    application.offerSentAt = offerSentAt ? new Date(offerSentAt) : null
  }
  if (offerExpiresAt !== undefined) {
    application.offerExpiresAt = offerExpiresAt
      ? new Date(offerExpiresAt)
      : null
  }
  if (offerAcceptedAt !== undefined) {
    application.offerAcceptedAt = offerAcceptedAt
      ? new Date(offerAcceptedAt)
      : null
  }
  if (offerDeclinedAt !== undefined) {
    application.offerDeclinedAt = offerDeclinedAt
      ? new Date(offerDeclinedAt)
      : null
  }
  if (shortlistedAt !== undefined) {
    application.shortlistedAt = shortlistedAt ? new Date(shortlistedAt) : null
  }
  if (rejectedAt !== undefined) {
    application.rejectedAt = rejectedAt ? new Date(rejectedAt) : null
  }
  if (rejectedReason !== undefined) {
    application.rejectedReason = rejectedReason || null
  }
  if (withdrawnAt !== undefined) {
    application.withdrawnAt = withdrawnAt ? new Date(withdrawnAt) : null
  }

  await application.save()

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
