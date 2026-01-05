import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from '@/models/plugins/softdelete'
import { publicFieldsPlugin } from '@/models/plugins/serializer'
import { createdByPlugin } from '@/models/plugins/createdby'
import { ITaskCategory } from '@/types/models'

const taskCategorySchema = new Schema<ITaskCategory>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

taskCategorySchema.plugin(softDeletePlugin)
taskCategorySchema.plugin(createdByPlugin)
taskCategorySchema.plugin(publicFieldsPlugin, [
  'organization',
  'name',
  'description',
  'isGlobal',
  'createdBy',
  'createdByType',
  'createdByProfile',
])

taskCategorySchema.index(
  { organization: 1, name: 1 },
  { unique: true, partialFilterExpression: { isGlobal: false } }
)

taskCategorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isGlobal: true } }
)
taskCategorySchema.index({ organization: 1 })
taskCategorySchema.index({ isGlobal: 1 })

const TaskCategory: Model<ITaskCategory> = mongoose.model<ITaskCategory>(
  'TaskCategory',
  taskCategorySchema
)

export default TaskCategory
