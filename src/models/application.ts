import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/softdelete'
import { publicFieldsPlugin } from './plugins/serializer'
import { createdByPlugin } from './plugins/createdby'
import { IApplication } from '@/types/models'

const applicationSchema = new Schema<IApplication>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    applicant: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    coverLetter: {
      type: String,
      default: null,
    },
    resumePath: {
      type: String,
      default: null,
    },
    availability: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'shortlisted',
        'offer_sent',
        'offer_accepted',
        'offer_declined',
        'offer_expired',
        'rejected',
        'withdrawn',
      ],
      required: true,
      default: 'submitted',
    },
    offerSentAt: {
      type: Date,
      default: null,
    },
    offerExpiresAt: {
      type: Date,
      default: null,
    },
    offerAcceptedAt: {
      type: Date,
      default: null,
    },
    offerDeclinedAt: {
      type: Date,
      default: null,
    },
    shortlistedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedReason: {
      type: String,
      default: null,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

applicationSchema.plugin(softDeletePlugin)
applicationSchema.plugin(createdByPlugin)
applicationSchema.plugin(publicFieldsPlugin, [
  'organization',
  'task',
  'applicant',
  'coverLetter',
  'resumePath',
  'availability',
  'status',
  'offerSentAt',
  'offerExpiresAt',
  'offerAcceptedAt',
  'offerDeclinedAt',
  'shortlistedAt',
  'rejectedAt',
  'rejectedReason',
  'withdrawnAt',
  'createdBy',
  'createdByType',
  'createdByProfile',
])

applicationSchema.index({ task: 1, applicant: 1 }, { unique: true })
applicationSchema.index({ organization: 1 })
applicationSchema.index({ applicant: 1 })
applicationSchema.index({ status: 1 })
applicationSchema.index({ organization: 1, status: 1 })
applicationSchema.index({ task: 1, status: 1 })
applicationSchema.index({ offerExpiresAt: 1 })
applicationSchema.index({ createdAt: -1 })

const Application: Model<IApplication> = mongoose.model<IApplication>(
  'Application',
  applicationSchema
)

export default Application
