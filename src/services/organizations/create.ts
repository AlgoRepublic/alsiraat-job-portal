import { checkPermissions } from '@/utils/auth'
import Organization from '@/models/organization'
import Profile from '@/models/profile'
import User from '@/models/user'
import { saveFile } from '@/utils/storage'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { setCreatedBy } from '@/utils/createdby'
import { RequestContext } from '@/types/common'
import { IOrganization } from '@/types/models'
import Joi from 'joi'

const createAdminProfiles = async (organizationId?: string): Promise<void> => {
  const admins = await User.find({ isAdmin: true }).exec()
  const organizations = organizationId
    ? [await Organization.findById(organizationId).exec()]
    : await Organization.find({}).exec()

  if (!organizations || organizations.length === 0) return

  for (const admin of admins) {
    for (const org of organizations) {
      if (!org) continue
      try {
        const existingProfile = await Profile.exists({
          organization: org._id,
          user: admin._id,
        })
        if (!existingProfile) {
          const profile = new Profile()
          profile.organization = org._id
          profile.user = admin._id
          profile.roles = []
          profile.permissionCodes = []
          await profile.save()
        }
      } catch (error) {
        // Profile already exists or error creating
      }
    }
  }
}

export default async (ctx: RequestContext): Promise<IOrganization> => {
  await checkPermissions(ctx, ['organization.create'])
  const {
    name,
    code,
    logo,
    colorPalette,
    loginWelcomeText,
    footerText,
    bannerImages,
    maxFileSize,
    maxFilesPerTask,
    offerExpiryDays,
    isSuspended,
    isPublic,
    allowGlobalTasks,
    allowExternalTasks,
  } = ctx.request.data

  const schema = Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required().uppercase(),
    logo: Joi.object().optional(),
    colorPalette: Joi.object({
      primary: Joi.string().optional(),
      secondary: Joi.string().optional(),
      accent: Joi.string().optional(),
    }).optional(),
    loginWelcomeText: Joi.string().optional(),
    footerText: Joi.string().optional(),
    bannerImages: Joi.array().items(Joi.string()).optional(),
    maxFileSize: Joi.number().optional(),
    maxFilesPerTask: Joi.number().optional(),
    offerExpiryDays: Joi.number().optional(),
    isSuspended: Joi.boolean().optional(),
    isPublic: Joi.boolean().optional(),
    allowGlobalTasks: Joi.boolean().optional(),
    allowExternalTasks: Joi.boolean().optional(),
  })

  const { error } = await joiValidate(schema, {
    name,
    code,
    logo,
    colorPalette,
    loginWelcomeText,
    footerText,
    bannerImages,
    maxFileSize,
    maxFilesPerTask,
    offerExpiryDays,
    isSuspended,
    isPublic,
    allowGlobalTasks,
    allowExternalTasks,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  if (await Organization.exists({ name: name.trim() })) {
    throw new CustomError('Organization already exist with this name')
  }

  if (await Organization.exists({ code: code.trim().toUpperCase() })) {
    throw new CustomError('Organization already exist with this code')
  }

  const organization = new Organization()
  organization.name = name.trim()
  organization.code = code.trim().toUpperCase()

  if (logo) {
    organization.logo = await saveFile(logo, 'models/organizations/logo')
  }

  if (colorPalette) {
    organization.colorPalette = {
      primary: colorPalette.primary || '#000000',
      secondary: colorPalette.secondary || '#ffffff',
      accent: colorPalette.accent || '#0066cc',
    }
  }

  if (loginWelcomeText !== undefined) {
    organization.loginWelcomeText = loginWelcomeText
  }

  if (footerText !== undefined) {
    organization.footerText = footerText
  }

  if (bannerImages !== undefined) {
    organization.bannerImages = bannerImages
  }

  if (maxFileSize !== undefined) {
    organization.maxFileSize = maxFileSize
  }

  if (maxFilesPerTask !== undefined) {
    organization.maxFilesPerTask = maxFilesPerTask
  }

  if (offerExpiryDays !== undefined) {
    organization.offerExpiryDays = offerExpiryDays
  }

  if (isSuspended !== undefined) {
    organization.isSuspended = isSuspended
  }

  if (isPublic !== undefined) {
    organization.isPublic = isPublic
  }

  if (allowGlobalTasks !== undefined) {
    organization.allowGlobalTasks = allowGlobalTasks
  }

  if (allowExternalTasks !== undefined) {
    organization.allowExternalTasks = allowExternalTasks
  }

  setCreatedBy(organization, ctx)

  await organization.save()

  await createAdminProfiles()

  return (await Organization.findById(organization._id)
    .select((Organization as any).publicFields())
    .exec()) as IOrganization
}
