import { pagyParams, pagyRes } from '@/utils/pagination'
import { checkPermissions } from '@/utils/auth'
import Application from '@/models/application'
import Task from '@/models/task'
import Profile from '@/models/profile'
import { RequestContext, PaginatedResponse } from '@/types/common'
import { IApplication } from '@/types/models'

export default async (
  ctx: RequestContext
): Promise<PaginatedResponse<IApplication>> => {
  await checkPermissions(ctx, ['application.view'])
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
    query.organization = organizationId
  } else if (!isAdmin) {
    return pagyRes([], 0, page, perPage)
  }

  // Filter by status if provided
  if (data.status) {
    query.status = data.status
  }

  // Filter by task if provided
  if (data.task) {
    query.task = data.task
  }

  // Filter by applicant if provided
  if (data.applicant) {
    query.applicant = data.applicant
  }

  const taskPublicFields = (Task as any).publicFields() || []
  const profilePublicFields = (Profile as any).publicFields() || []
  const applicationPublicFields = (Application as any).publicFields() || []

  const applicationPromise = Application.find(query)
    .populate({
      path: 'task',
      select: taskPublicFields.join(' '),
    })
    .populate({
      path: 'applicant',
      select: profilePublicFields.join(' '),
    })
    .select(applicationPublicFields.join(' '))
    .sort({ [sortBy]: order })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec()

  const countPromise = Application.countDocuments(query).exec()
  const [applications, count] = await Promise.all([
    applicationPromise,
    countPromise,
  ])

  return pagyRes(applications, count, page, perPage)
}
