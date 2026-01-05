import { CustomError } from '@/utils/error'
import { logError } from '@/utils/log'
import { decodeToken } from '@/utils/jwt'
import User from '@/models/user'
import Profile from '@/models/profile'
import { AuthContext } from '@/types/common'

export const tryLoginByToken = async (
  token: string | null,
  profileId: string | null
): Promise<AuthContext> => {
  try {
    const decoded = await decodeToken(token || undefined)

    if (!decoded) {
      throw new CustomError('Invalid token')
    }

    const { _id } = decoded

    const user = await User.findById(_id)

    if (!user) {
      throw new CustomError('Invalid token')
    }

    let profile = null

    if (profileId) {
      profile = await Profile.findById(profileId)
        .populate({
          path: 'organization',
        })
        .populate({
          path: 'roles',
          select: 'permissionCodes',
        })
        .exec()

      if (!profile) {
        throw new CustomError('Invalid profile')
      }

      if (profile.user.toString() !== user._id.toString()) {
        throw new CustomError('Invalid profile')
      }

      // Ensure permissionCodes are populated from roles if not already set
      if (profile.permissionCodes.length === 0 && profile.roles) {
        const allPermissionCodes = new Set<string>()
        for (const role of profile.roles) {
          if (typeof role === 'object' && 'permissionCodes' in role) {
            const rolePermissionCodes = (role as any).permissionCodes || []
            rolePermissionCodes.forEach((code: string) =>
              allPermissionCodes.add(code)
            )
          }
        }
        profile.permissionCodes = Array.from(allPermissionCodes)
      }
    }

    return {
      authenticated: true,
      user: user,
      profile: profile || null,
    }
  } catch (error) {
    logError(error)

    return {
      authenticated: false,
      user: null,
      profile: null,
    }
  }
}

export const checkPermissions = async (
  ctx: { auth: AuthContext } | null | undefined,
  permissions: string[] = [],
  options: { otpMustBeVerified?: boolean; profileMustPresent?: boolean } = {}
): Promise<boolean> => {
  if (!ctx) {
    throw new CustomError('Invalid context', 401)
  }

  if (!Array.isArray(permissions)) {
    throw new CustomError('Invalid permissions', 401)
  }

  const {
    auth: { authenticated, user, profile },
  } = ctx

  if (!authenticated) {
    throw new CustomError('Unauthorized', 401)
  }

  // If no permissions required, just check authentication
  if (permissions.length === 0) {
    return true
  }

  // Super admin bypass (if user is admin)
  if (user?.isAdmin === true) {
    return true
  }

  // Check if profile is required
  if (options.profileMustPresent && !profile) {
    throw new CustomError('Profile context required', 401)
  }

  // If profile is not present, check if any permission allows it
  if (!profile) {
    // For now, if no profile, only allow if user is admin
    // This can be customized based on requirements
    throw new CustomError('Profile context required for permission check', 401)
  }

  // Get user's permission codes from profile
  const userPermissionCodes = profile.permissionCodes || []

  // Check if user has at least one of the required permissions
  const hasPermission = permissions.some((permission) =>
    userPermissionCodes.includes(permission)
  )

  if (!hasPermission) {
    throw new CustomError(
      `Insufficient permissions. Required: ${permissions.join(', ')}`,
      403
    )
  }

  return true
}
