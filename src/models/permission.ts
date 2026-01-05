import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/softdelete'
import { publicFieldsPlugin } from './plugins/serializer'
import { IPermission } from '@/types/models'

const permissionSchema = new Schema<IPermission>(
  {
    entity: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

permissionSchema.plugin(softDeletePlugin)
permissionSchema.plugin(publicFieldsPlugin, [
  'entity',
  'name',
  'code',
  'position',
])

const Permission: Model<IPermission> = mongoose.model<IPermission>(
  'Permission',
  permissionSchema
)

export default Permission
