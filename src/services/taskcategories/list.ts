import { pagyParams, pagyRes } from '@/utils/pagination'
import { checkPermissions } from '@/utils/auth'
import TaskCategory from '@/models/taskcategory'
import { RequestContext, PaginatedResponse } from '@/types/common'
import { ITaskCategory } from '@/types/models'

export default async (
  ctx: RequestContext
): Promise<PaginatedResponse<ITaskCategory>> => {
  await checkPermissions(ctx, ['category.view'])
  const data = ctx.request.data

  const { page, perPage, sortBy, order } = pagyParams(
    data.page,
    data.perPage,
    data.sortBy,
    data.order
  )

  const isAdmin = ctx.auth.user?.isAdmin === true
  let query: any = {}

  if (!isAdmin && ctx.auth.profile) {
    const organizationId = ctx.auth.profile.organization
    query.$or = [{ organization: organizationId }, { isGlobal: true }]
  } else if (!isAdmin) {
    return pagyRes([], 0, page, perPage)
  }

  const taskCategoryPromise = TaskCategory.find(query)
    .select((TaskCategory as any).publicFields())
    .sort({ [sortBy]: order })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec()

  const countPromise = TaskCategory.countDocuments(query).exec()
  const [taskCategories, count] = await Promise.all([
    taskCategoryPromise,
    countPromise,
  ])

  return pagyRes(taskCategories, count, page, perPage)
}
