import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/softdelete'
import { publicFieldsPlugin } from './plugins/serializer'
import { IProfile } from '@/types/models'

const profileSchema = new Schema<IProfile>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roles: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
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

profileSchema.plugin(softDeletePlugin)
profileSchema.plugin(publicFieldsPlugin, [
  'organization',
  'user',
  'roles',
  'permissionCodes',
])

const Profile: Model<IProfile> = mongoose.model<IProfile>(
  'Profile',
  profileSchema
)

export default Profile
