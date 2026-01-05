import { checkPermissions } from '@/utils/auth'
import Task from '@/models/task'
import TaskCategory from '@/models/taskcategory'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { setCreatedBy } from '@/utils/createdby'
import { RequestContext } from '@/types/common'
import { ITask } from '@/types/models'
import Joi from 'joi'

export default async (ctx: RequestContext): Promise<ITask> => {
  await checkPermissions(ctx, ['task.create'])
  const {
    title,
    category,
    description,
    location,
    estimatedHours,
    startDate,
    closeDate,
    keySelectionCriteria,
    publishTo,
    scope,
    rewardType,
    rewardValue,
    status,
    attachments,
    organization,
  } = ctx.request.data

  const schema = Joi.object({
    title: Joi.string().required().trim(),
    category: Joi.string().hex().length(24).required(),
    description: Joi.string().required().min(10),
    location: Joi.string().required().trim(),
    estimatedHours: Joi.number().required().min(0),
    startDate: Joi.date().required(),
    closeDate: Joi.date().required(),
    keySelectionCriteria: Joi.string().optional().allow(null, ''),
    publishTo: Joi.array()
      .items(Joi.string().valid('students', 'parents', 'community', 'staff'))
      .min(1)
      .required(),
    scope: Joi.string()
      .valid('internal', 'external', 'global')
      .optional()
      .default('internal'),
    rewardType: Joi.string()
      .valid(
        'paid_lumpsum',
        'paid_per_hour',
        'voucher',
        'via_hours',
        'community_service',
        'volunteer'
      )
      .required(),
    rewardValue: Joi.number().optional().allow(null).min(0),
    status: Joi.string()
      .valid(
        'draft',
        'pending_review',
        'published',
        'completed',
        'reward_issued',
        'archived'
      )
      .optional()
      .default('draft'),
    attachments: Joi.array()
      .items(Joi.string().hex().length(24))
      .optional()
      .default([]),
    organization: Joi.string().hex().length(24).optional(),
  })

  const { error } = await joiValidate(schema, {
    title,
    category,
    description,
    location,
    estimatedHours,
    startDate,
    closeDate,
    keySelectionCriteria,
    publishTo,
    scope,
    rewardType,
    rewardValue,
    status,
    attachments,
    organization,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  // Validate category exists
  const taskCategory = await TaskCategory.findById(category).exec()
  if (!taskCategory) {
    throw new CustomError('Task category not found', 400)
  }

  // Validate dates
  if (new Date(closeDate) < new Date(startDate)) {
    throw new CustomError('Close date must be after start date', 400)
  }

  const orgId = organization || ctx.auth.profile?.organization
  if (!orgId) {
    throw new CustomError('Organization is required', 400)
  }

  const task = await Task.create({
    organization: orgId,
    title: title.trim(),
    category,
    description,
    location: location.trim(),
    estimatedHours,
    startDate: new Date(startDate),
    closeDate: new Date(closeDate),
    keySelectionCriteria: keySelectionCriteria || null,
    publishTo,
    scope: scope || 'internal',
    rewardType,
    rewardValue: rewardValue || null,
    status: status || 'draft',
    attachments: attachments || [],
  })

  await setCreatedBy(task, ctx)

  const taskCategoryPublicFields = (TaskCategory as any).publicFields() || []
  const taskPublicFields = (Task as any).publicFields() || []

  return (await Task.findById(task._id)
    .populate({
      path: 'category',
      select: taskCategoryPublicFields.join(' '),
    })
    .select(taskPublicFields.join(' '))
    .exec()) as ITask
}
