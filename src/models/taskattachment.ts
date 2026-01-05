import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from '@/models/plugins/softdelete'
import { publicFieldsPlugin } from '@/models/plugins/serializer'
import { createdByPlugin } from '@/models/plugins/createdby'
import { ITaskAttachment } from '@/types/models'

const taskAttachmentSchema = new Schema<ITaskAttachment>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    scanned: {
      type: Boolean,
      default: false,
    },
    scanResult: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

taskAttachmentSchema.plugin(softDeletePlugin)
taskAttachmentSchema.plugin(createdByPlugin)
taskAttachmentSchema.plugin(publicFieldsPlugin, [
  'task',
  'filePath',
  'fileName',
  'fileSize',
  'mimeType',
  'notes',
  'isPublic',
  'version',
  'scanned',
  'scanResult',
  'createdBy',
  'createdByType',
  'createdByProfile',
])

taskAttachmentSchema.index({ task: 1 })
taskAttachmentSchema.index({ scanned: 1 })

const TaskAttachment: Model<ITaskAttachment> = mongoose.model<ITaskAttachment>(
  'TaskAttachment',
  taskAttachmentSchema
)

export default TaskAttachment
