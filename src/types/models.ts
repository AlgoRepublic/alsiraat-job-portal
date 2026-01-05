import { Document, Types } from 'mongoose'

export interface ISoftDelete {
  deletedAt?: Date | null
  softDelete(): Promise<this>
  restore(): Promise<this>
  isDeleted(): boolean
}

export interface IPublicFields {
  publicFields(): string[]
  publicObject?(): Record<string, any>
}

export interface IJwtToken {
  generateAccessToken(): Promise<string>
}

export interface ICreatedBy {
  createdBy?: Types.ObjectId | null
  createdByType?: 'user' | 'system' | null
  createdByProfile?: Types.ObjectId | null
}

export interface ITimestamp {
  createdAt: Date
  updatedAt: Date
}

export interface IUser
  extends Document,
    ISoftDelete,
    IPublicFields,
    IJwtToken,
    ITimestamp {
  _id: Types.ObjectId
  name: string
  email: string
  encryptedPassword: string
  avatar?: string | null
  isAdmin: boolean
}

export interface IOrganizationColorPalette {
  primary: string
  secondary: string
  accent: string
}

export interface IOrganization
  extends Document,
    ISoftDelete,
    IPublicFields,
    ICreatedBy,
    ITimestamp {
  _id: Types.ObjectId
  name: string
  code: string
  logo?: string | null
  colorPalette: IOrganizationColorPalette
  loginWelcomeText: string
  footerText: string
  bannerImages: string[]
  maxFileSize: number
  maxFilesPerTask: number
  offerExpiryDays: number
  isSuspended: boolean
  isPublic: boolean
  allowGlobalTasks: boolean
  allowExternalTasks: boolean
}

export interface IRole
  extends Document,
    ISoftDelete,
    IPublicFields,
    ICreatedBy,
    ITimestamp {
  _id: Types.ObjectId
  organization: Types.ObjectId | IOrganization
  name: string
  permissionCodes: string[]
  publicFields(): string[]
}

export interface IPermission
  extends Document,
    ISoftDelete,
    IPublicFields,
    ITimestamp {
  _id: Types.ObjectId
  entity: string
  name: string
  code: string
  position: number
}

export interface IProfileRole {
  role: Types.ObjectId | IRole
  permissionCodes: string[]
}

export interface IProfileDepartment {
  department: Types.ObjectId
  permissionCodes: string[]
}

export interface IProfileLocation {
  location: Types.ObjectId
  permissionCodes: string[]
}

export interface IProfile
  extends Document,
    ISoftDelete,
    IPublicFields,
    ITimestamp {
  _id: Types.ObjectId
  organization: Types.ObjectId | IOrganization
  user: Types.ObjectId | IUser
  roles: (Types.ObjectId | IRole)[]
  permissionCodes: string[]
}

export interface ITaskAttachment
  extends Document,
    ISoftDelete,
    IPublicFields,
    ICreatedBy,
    ITimestamp {
  _id: Types.ObjectId
  task: Types.ObjectId
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  notes?: string | null
  isPublic: boolean
  version: number
  scanned: boolean
  scanResult?: string | null
}

export type TaskStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'completed'
  | 'reward_issued'
  | 'archived'

export type TaskScope = 'internal' | 'external' | 'global'

export type TaskRewardType =
  | 'paid_lumpsum'
  | 'paid_per_hour'
  | 'voucher'
  | 'via_hours'
  | 'community_service'
  | 'volunteer'

export type TaskPublishTo = 'students' | 'parents' | 'community' | 'staff'

export interface ITaskCategory
  extends Document,
    ISoftDelete,
    IPublicFields,
    ICreatedBy,
    ITimestamp {
  _id: Types.ObjectId
  organization?: Types.ObjectId | IOrganization | null
  name: string
  description?: string | null
  isGlobal: boolean
}

export interface ITask
  extends Document,
    ISoftDelete,
    IPublicFields,
    ICreatedBy,
    ITimestamp {
  _id: Types.ObjectId
  organization: Types.ObjectId | IOrganization
  title: string
  category: Types.ObjectId | ITaskCategory
  description: string
  location: string
  estimatedHours: number
  startDate: Date
  closeDate: Date
  keySelectionCriteria?: string | null
  publishTo: TaskPublishTo[]
  scope: TaskScope
  rewardType: TaskRewardType
  rewardValue?: number | null
  status: TaskStatus
  attachments: (Types.ObjectId | ITaskAttachment)[]
  verifiedHours?: number | null
  completedAt?: Date | null
  rewardIssuedAt?: Date | null
}

export type ApplicationStatus =
  | 'submitted'
  | 'shortlisted'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'
  | 'offer_expired'
  | 'rejected'
  | 'withdrawn'

export interface IApplication
  extends Document,
    ISoftDelete,
    IPublicFields,
    ICreatedBy,
    ITimestamp {
  _id: Types.ObjectId
  organization: Types.ObjectId | IOrganization
  task: Types.ObjectId | ITask
  applicant: Types.ObjectId | IProfile
  coverLetter?: string | null
  resumePath?: string | null
  availability?: string | null
  status: ApplicationStatus
  offerSentAt?: Date | null
  offerExpiresAt?: Date | null
  offerAcceptedAt?: Date | null
  offerDeclinedAt?: Date | null
  shortlistedAt?: Date | null
  rejectedAt?: Date | null
  rejectedReason?: string | null
  withdrawnAt?: Date | null
}
