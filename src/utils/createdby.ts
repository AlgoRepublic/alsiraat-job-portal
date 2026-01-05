import { Document, Types } from 'mongoose'
import { RequestContext } from '@/types/common'
import { ICreatedBy } from '@/types/models'

/**
 * Sets the createdBy, createdByType, and createdByProfile fields on a document from the request context
 * If no user is authenticated, sets createdByType to 'system' and createdBy to null
 * @param doc - The document to set createdBy fields on
 * @param ctx - The request context containing user and profile information
 */
export const setCreatedBy = <T extends Document & ICreatedBy>(
  doc: T,
  ctx: RequestContext
): void => {
  if (ctx.auth.user?._id) {
    doc.createdBy = ctx.auth.user._id as Types.ObjectId
    doc.createdByType = 'user'
  } else {
    doc.createdBy = null
    doc.createdByType = 'system'
  }
  if (ctx.auth.profile?._id) {
    doc.createdByProfile = ctx.auth.profile._id as Types.ObjectId
  }
}
