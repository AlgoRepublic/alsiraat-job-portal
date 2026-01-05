import { pagyParams, pagyRes } from '@/utils/pagination'
import { checkPermissions } from '@/utils/auth'
import Organization from '@/models/organization'
import Profile from '@/models/profile'
import { RequestContext, PaginatedResponse } from '@/types/common'
import { IOrganization } from '@/types/models'

export default async (
  ctx: RequestContext
): Promise<PaginatedResponse<IOrganization>> => {
  await checkPermissions(ctx, ['organization.view'])
  const data = ctx.request.data

  const { page, perPage, sortBy, order } = pagyParams(
    data.page,
    data.perPage,
    data.sortBy,
    data.order
  )

  const isAdmin = ctx.auth.user?.isAdmin === true
  let query: any = {}

  if (!isAdmin) {
    const userId = ctx.auth.user?._id.toString()
    if (!userId) {
      return pagyRes([], 0, page, perPage)
    }

    const userProfiles = await Profile.find({
      user: userId,
      deletedAt: null,
    })
      .select('organization')
      .exec()

    const organizationIds = userProfiles.map((profile) => profile.organization)

    if (organizationIds.length === 0) {
      return pagyRes([], 0, page, perPage)
    }

    query._id = { $in: organizationIds }
  }

  const organizationPromise = Organization.find(query)
    .select((Organization as any).publicFields())
    .sort({ [sortBy]: order })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec()

  const countPromise = Organization.countDocuments(query).exec()
  const [organizations, count] = await Promise.all([
    organizationPromise,
    countPromise,
  ])

  return pagyRes(organizations, count, page, perPage)
}
