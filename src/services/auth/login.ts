import Joi from 'joi'
import User from '@/models/user'
import Profile from '@/models/profile'
import Organization from '@/models/organization'
import Role from '@/models/role'
import { comparePassword } from '@/utils/password'
import { CustomError } from '@/utils/error'
import { joiValidate, joiError } from '@/utils/joi'
import { RequestContext } from '@/types/common'
import { IUser, IProfile } from '@/types/models'

interface LoginResponse {
  token: string
  user: IUser
  profiles?: IProfile[]
}

export default async (ctx: RequestContext): Promise<LoginResponse> => {
  const schema = Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().min(1),
  })

  const { error, value } = await joiValidate(schema, ctx.request.data)

  if (error) {
    throw new CustomError(joiError(error), 400)
  }

  const { email, password } = value

  const user = await User.findOne({ email })

  if (!user) {
    throw new CustomError('Invalid email or password', 401)
  }

  const isPasswordValid = await comparePassword(
    user.encryptedPassword,
    password
  )

  if (!isPasswordValid) {
    throw new CustomError('Invalid email or password', 401)
  }

  const token = await user.generateAccessToken()

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
