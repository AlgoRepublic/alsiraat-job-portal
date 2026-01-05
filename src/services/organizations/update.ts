import { checkPermissions } from '@/utils/auth'
import Organization from '@/models/organization'
import Profile from '@/models/profile'
import User from '@/models/user'
import { saveFile } from '@/utils/storage'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { toBoolean } from '@/utils/helpers'
import { RequestContext } from '@/types/common'
import { IOrganization } from '@/types/models'
import Joi from 'joi'

const findById = async (_id: string): Promise<IOrganization> => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
  })

  const { error } = await joiValidate(schema, { _id })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const organization = await Organization.findById(_id).exec()

  if (!organization) throw new CustomError('Organization not found')

  return organization
}

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
  await checkPermissions(ctx, ['organization.update'])
  const {
    _id,
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
    restore,
  } = ctx.request.data

  const schema = Joi.object({
    _id: Joi.string().hex().length(24).required(),
    name: Joi.string().optional(),
    code: Joi.string().optional().uppercase(),
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
    restore: Joi.boolean().optional(),
  })

  const { error } = await joiValidate(schema, {
    _id,
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
    restore,
  })

  if (error) {
    throw new CustomError(joiError(error))
  }

  const organization = await findById(_id)

  if (name !== undefined) {
    if (
      await Organization.exists({
        name: name.trim(),
        _id: { $ne: organization._id },
      })
    ) {
      throw new CustomError('Organization already exist with this name')
    } else {
      organization.name = name.trim()
    }
  }

  if (code !== undefined) {
    if (
      await Organization.exists({
        code: code.trim().toUpperCase(),
        _id: { $ne: organization._id },
      })
    ) {
      throw new CustomError('Organization already exist with this code')
    } else {
      organization.code = code.trim().toUpperCase()
    }
  }

  if (logo !== undefined) {
    organization.logo = await saveFile(logo, 'models/organizations/logo')
  }

  if (colorPalette !== undefined) {
    if (colorPalette.primary !== undefined) {
      organization.colorPalette.primary = colorPalette.primary
    }
    if (colorPalette.secondary !== undefined) {
      organization.colorPalette.secondary = colorPalette.secondary
    }
    if (colorPalette.accent !== undefined) {
      organization.colorPalette.accent = colorPalette.accent
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

  await organization.save()

  if (toBoolean(restore)) {
    await organization.restore()
  }

  await createAdminProfiles(_id)

  return (await Organization.findById(organization._id)
    .select((Organization as any).publicFields())
    .exec()) as IOrganization
}
