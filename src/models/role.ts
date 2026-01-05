import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from '@/models/plugins/softdelete'
import { publicFieldsPlugin } from '@/models/plugins/serializer'
import { createdByPlugin } from '@/models/plugins/createdby'
import { IRole } from '@/types/models'

const roleSchema = new Schema<IRole>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    permissionCodes: [
      {
        type: String,
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
)

roleSchema.plugin(softDeletePlugin)
roleSchema.plugin(createdByPlugin)
roleSchema.plugin(publicFieldsPlugin, [
  'organization',
  'name',
  'permissionCodes',
  'createdBy',
  'createdByType',
  'createdByProfile',
])

const Role: Model<IRole> = mongoose.model<IRole>('Role', roleSchema)

export default Role
