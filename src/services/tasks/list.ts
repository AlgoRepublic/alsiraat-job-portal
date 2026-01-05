import { pagyParams, pagyRes } from '@/utils/pagination'
import { checkPermissions } from '@/utils/auth'
import Task from '@/models/task'
import TaskCategory from '@/models/taskcategory'
import { RequestContext, PaginatedResponse } from '@/types/common'
import { ITask } from '@/types/models'

export default async (
  ctx: RequestContext
): Promise<PaginatedResponse<ITask>> => {
  await checkPermissions(ctx, ['task.view'])
  const data = ctx.request.data

  const { page, perPage, sortBy, order } = pagyParams(
    data.page,
    data.perPage,
    data.sortBy,
    data.order
  )

  const isAdmin = ctx.auth.user?.isAdmin === true
  let query: any = {
    deletedAt: null,
  }

  if (!isAdmin && ctx.auth.profile) {
    const organizationId = ctx.auth.profile.organization
    query.$or = [
      { organization: organizationId },
      { scope: { $in: ['external', 'global'] } },
    ]
  } else if (!isAdmin) {
    return pagyRes([], 0, page, perPage)
  }

  // Filter by status if provided
  if (data.status) {
    query.status = data.status
  }

  // Filter by category if provided
  if (data.category) {
    query.category = data.category
  }

  // Filter by scope if provided
  if (data.scope) {
    query.scope = data.scope
  }

  // Filter by rewardType if provided
  if (data.rewardType) {
    query.rewardType = data.rewardType
  }

  const taskCategoryPublicFields = (TaskCategory as any).publicFields() || []
  const taskPublicFields = (Task as any).publicFields() || []

  const taskPromise = Task.find(query)
    .populate({
      path: 'category',
      select: taskCategoryPublicFields.join(' '),
    })
    .select(taskPublicFields.join(' '))
    .sort({ [sortBy]: order })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec()

  const countPromise = Task.countDocuments(query).exec()
  const [tasks, count] = await Promise.all([taskPromise, countPromise])

  return pagyRes(tasks, count, page, perPage)
}
