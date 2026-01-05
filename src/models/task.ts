import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from '@/models/plugins/softdelete'
import { publicFieldsPlugin } from '@/models/plugins/serializer'
import { createdByPlugin } from '@/models/plugins/createdby'
import { ITask } from '@/types/models'

const taskSchema = new Schema<ITask>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'TaskCategory',
      required: true,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedHours: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    closeDate: {
      type: Date,
      required: true,
    },
    keySelectionCriteria: {
      type: String,
      default: null,
    },
    publishTo: [
      {
        type: String,
        enum: ['students', 'parents', 'community', 'staff'],
        required: true,
      },
    ],
    scope: {
      type: String,
      enum: ['internal', 'external', 'global'],
      required: true,
      default: 'internal',
    },
    rewardType: {
      type: String,
      enum: [
        'paid_lumpsum',
        'paid_per_hour',
        'voucher',
        'via_hours',
        'community_service',
        'volunteer',
      ],
      required: true,
    },
    rewardValue: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_review',
        'published',
        'completed',
        'reward_issued',
        'archived',
      ],
      required: true,
      default: 'draft',
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TaskAttachment',
      },
    ],
    verifiedHours: {
      type: Number,
      default: null,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    rewardIssuedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

taskSchema.plugin(softDeletePlugin)
taskSchema.plugin(createdByPlugin)
taskSchema.plugin(publicFieldsPlugin, [
  'organization',
  'title',
  'category',
  'description',
  'location',
  'estimatedHours',
  'startDate',
  'closeDate',
  'keySelectionCriteria',
  'publishTo',
  'scope',
  'rewardType',
  'rewardValue',
  'status',
  'attachments',
  'verifiedHours',
  'completedAt',
  'rewardIssuedAt',
  'createdBy',
  'createdByType',
  'createdByProfile',
])

taskSchema.index({ organization: 1 })
taskSchema.index({ status: 1 })
taskSchema.index({ category: 1 })
taskSchema.index({ scope: 1 })
taskSchema.index({ rewardType: 1 })
taskSchema.index({ startDate: 1 })
taskSchema.index({ closeDate: 1 })
taskSchema.index({ createdAt: -1 })

const Task: Model<ITask> = mongoose.model<ITask>('Task', taskSchema)

export default Task
