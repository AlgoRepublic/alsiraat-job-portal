import mongoose, { Schema, Model } from 'mongoose'
import { softDeletePlugin } from '@/models/plugins/softdelete'
import { publicFieldsPlugin } from '@/models/plugins/serializer'
import { createdByPlugin } from '@/models/plugins/createdby'
import { IOrganization } from '@/types/models'

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      default: null,
    },
    colorPalette: {
      primary: { type: String, default: '#000000' },
      secondary: { type: String, default: '#ffffff' },
      accent: { type: String, default: '#0066cc' },
    },
    loginWelcomeText: {
      type: String,
      default: 'Welcome to Task Marketplace',
    },
    footerText: {
      type: String,
      default: '',
    },
    bannerImages: [
      {
        type: String,
      },
    ],
    maxFileSize: {
      type: Number,
      default: 10 * 1024 * 1024, // 10MB in bytes
    },
    maxFilesPerTask: {
      type: Number,
      default: 3,
    },
    offerExpiryDays: {
      type: Number,
      default: 7,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowGlobalTasks: {
      type: Boolean,
      default: false,
    },
    allowExternalTasks: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

organizationSchema.plugin(softDeletePlugin)
organizationSchema.plugin(createdByPlugin)
organizationSchema.plugin(publicFieldsPlugin, [
  'name',
  'code',
  'logo',
  'colorPalette',
  'loginWelcomeText',
  'footerText',
  'bannerImages',
  'maxFileSize',
  'maxFilesPerTask',
  'offerExpiryDays',
  'isSuspended',
  'isPublic',
  'allowGlobalTasks',
  'allowExternalTasks',
  'createdBy',
  'createdByType',
  'createdByProfile',
])

organizationSchema.index({ code: 1 }, { unique: true })
organizationSchema.index({ name: 1 })

const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  'Organization',
  organizationSchema
)

export default Organization
