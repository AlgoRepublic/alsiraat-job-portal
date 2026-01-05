import { checkPermissions } from '@/utils/auth'
import Task from '@/models/task'
import TaskCategory from '@/models/taskcategory'
import TaskAttachment from '@/models/taskattachment'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { saveFile } from '@/utils/storage'
import { setCreatedBy } from '@/utils/createdby'
import { RequestContext } from '@/types/common'
import { ITask } from '@/types/models'
import Joi from 'joi'

const findById = async (_id: string): Promise<ITask> => {
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

export default async (ctx: RequestContext): Promise<ITask> => {
  await checkPermissions(ctx, ['task.update'])
  const {
    _id,
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
    verifiedHours,
    completedAt,
    rewardIssuedAt,
  } = ctx.request.data

  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
    title: Joi.string().optional().trim(),
    category: Joi.string().hex().length(24).optional(),
    description: Joi.string().optional().min(10),
    location: Joi.string().optional().trim(),
    estimatedHours: Joi.number().optional().min(0),
    startDate: Joi.date().optional(),
    closeDate: Joi.date().optional(),
    keySelectionCriteria: Joi.string().optional().allow(null, ''),
    publishTo: Joi.array()
      .items(Joi.string().valid('students', 'parents', 'community', 'staff'))
      .min(1)
      .optional(),
    scope: Joi.string().valid('internal', 'external', 'global').optional(),
    rewardType: Joi.string()
      .valid(
        'paid_lumpsum',
        'paid_per_hour',
        'voucher',
        'via_hours',
        'community_service',
        'volunteer'
      )
      .optional(),
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
      .optional(),
    attachments: Joi.array()
      .items(
        Joi.object({
          data: Joi.binary().required(),
        }).unknown()
      )
      .optional(),
    verifiedHours: Joi.number().optional().allow(null).min(0),
    completedAt: Joi.date().optional().allow(null),
    rewardIssuedAt: Joi.date().optional().allow(null),
  })

  const { error } = await joiValidate(schema, {
    _id,
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
    verifiedHours,
    completedAt,
    rewardIssuedAt,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const task = await findById(_id)

  if (title !== undefined) {
    task.title = title.trim()
  }
  if (category !== undefined) {
    const taskCategory = await TaskCategory.findById(category).exec()
    if (!taskCategory) {
      throw new CustomError('Task category not found', 400)
    }
    task.category = category as any
  }
  if (description !== undefined) {
    task.description = description
  }
  if (location !== undefined) {
    task.location = location.trim()
  }
  if (estimatedHours !== undefined) {
    task.estimatedHours = estimatedHours
  }
  if (startDate !== undefined) {
    task.startDate = new Date(startDate)
  }
  if (closeDate !== undefined) {
    task.closeDate = new Date(closeDate)
  }
  if (keySelectionCriteria !== undefined) {
    task.keySelectionCriteria = keySelectionCriteria || null
  }
  if (publishTo !== undefined) {
    task.publishTo = publishTo
  }
  if (scope !== undefined) {
    task.scope = scope
  }
  if (rewardType !== undefined) {
    task.rewardType = rewardType
  }
  if (rewardValue !== undefined) {
    task.rewardValue = rewardValue || null
  }
  if (status !== undefined) {
    task.status = status
  }
  if (attachments !== undefined) {
    // If attachments are provided, process them as file objects
    if (Array.isArray(attachments) && attachments.length > 0) {
      const attachmentIds = []
      for (const file of attachments) {
        // Save the file
        const filePath = await saveFile(file, 'models/tasks/attachments')

        // Create TaskAttachment document
        const taskAttachment = await TaskAttachment.create({
          task: task._id,
          filePath,
          fileName: file.name || 'attachment',
          fileSize: file.size || 0,
          mimeType: file.mimetype || 'application/octet-stream',
          notes: null,
          isPublic: false,
          version: 1,
          scanned: false,
          scanResult: null,
        })

        await setCreatedBy(taskAttachment, ctx)
        await taskAttachment.save()

        attachmentIds.push(taskAttachment._id)
      }
      task.attachments = attachmentIds as any
    } else {
      // If empty array, clear attachments
      task.attachments = []
    }
  }
  if (verifiedHours !== undefined) {
    task.verifiedHours = verifiedHours || null
  }
  if (completedAt !== undefined) {
    task.completedAt = completedAt ? new Date(completedAt) : null
  }
  if (rewardIssuedAt !== undefined) {
    task.rewardIssuedAt = rewardIssuedAt ? new Date(rewardIssuedAt) : null
  }

  // Validate dates
  if (task.closeDate < task.startDate) {
    throw new CustomError('Close date must be after start date', 400)
  }

  await task.save()

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
