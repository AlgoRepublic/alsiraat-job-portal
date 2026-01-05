import Joi from 'joi'
import User from '@/models/user'
import Profile from '@/models/profile'
import Organization from '@/models/organization'
import Role from '@/models/role'
import { encryptPassword } from '@/utils/password'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { RequestContext } from '@/types/common'
import { IUser, IProfile } from '@/types/models'

interface SignupResponse {
  token: string
  user: IUser
  profiles?: IProfile[]
}

export default async (ctx: RequestContext): Promise<SignupResponse> => {
  const schema = Joi.object({
    name: Joi.string().required().trim().min(1),
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().min(6),
  })

  const { error, value } = await joiValidate(schema, ctx.request.data)

  if (error) {
    throw new CustomError(joiError(error), 400)
  }

  const { name, email, password } = value

  // Check if user already exists
  const existingUser = await User.findOne({ email, deletedAt: null }).exec()

  if (existingUser) {
    throw new CustomError('User with this email already exists', 400)
  }

  // Encrypt password
  const encryptedPassword = await encryptPassword(password)

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    encryptedPassword,
    isAdmin: false,
  })

  // Find Public Organization
  const organization = await Organization.findOne({ code: 'PUBLIC' }).exec()

  if (!organization) {
    throw new CustomError('Public organization not found', 500)
  }

  // Find Applicant role
  const applicantRole = await Role.findOne({
    organization: organization._id,
    name: 'Applicant',
    deletedAt: null,
  }).exec()

  if (!applicantRole) {
    throw new CustomError('Applicant role not found', 500)
  }

  // Create profile with Applicant role
  await Profile.create({
    user: user._id,
    organization: organization._id,
    roles: [applicantRole._id],
    permissionCodes: applicantRole.permissionCodes,
  })

  // Generate token
  const token = await user.generateAccessToken()

  // Fetch profiles with populated data
  const profiles = await Profile.find({ user: user._id })
    .populate({
      path: 'organization',
      select: (Organization as any).publicFields(),
    })
    .populate({
      path: 'roles',
      select: (Role as any).publicFields(),
    })
    .exec()

  return {
    token,
    user: user.toObject() as IUser,
    profiles: profiles.map((profile: IProfile) =>
      profile.toObject()
    ) as IProfile[],
  }
}
