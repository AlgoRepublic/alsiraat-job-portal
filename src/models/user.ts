import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/softdelete'
import { jwtPlugin } from './plugins/jwt'
import { publicFieldsPlugin } from './plugins/serializer'
import { IUser } from '@/types/models'

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    encryptedPassword: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

userSchema.plugin(jwtPlugin)
userSchema.plugin(softDeletePlugin)
userSchema.plugin(publicFieldsPlugin, ['name', 'email', 'avatar', 'isAdmin'])

userSchema.index({ email: 1 })
userSchema.index({ isAdmin: 1 })

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema)

export default User
