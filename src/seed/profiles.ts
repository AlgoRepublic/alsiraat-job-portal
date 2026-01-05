import Profile from '@/models/profile'
import User from '@/models/user'
import Organization from '@/models/organization'
import Role from '@/models/role'
import { logInfo, logError } from '@/utils/log'

const profiles = [
  {
    // Organization Admin user
    userEmail: 'orgadmin@example.com',
    organizationCode: 'PUBLIC',
    roleNames: ['Organization Admin'],
  },
  {
    // Task Manager user
    userEmail: 'taskmanager@example.com',
    organizationCode: 'PUBLIC',
    roleNames: ['Task Manager'],
  },
  {
    // Task Advertiser user
    userEmail: 'taskadvertiser@example.com',
    organizationCode: 'PUBLIC',
    roleNames: ['Task Advertiser'],
  },
  {
    // Applicant user
    userEmail: 'applicant@example.com',
    organizationCode: 'PUBLIC',
    roleNames: ['Applicant'],
  },
]

export const seedProfiles = async (): Promise<void> => {
  try {
    logInfo('Seeding profiles...')

    for (const profileData of profiles) {
      const user = await User.findOne({ email: profileData.userEmail })
      if (!user) {
        logError(`User not found: ${profileData.userEmail}`)
        continue
      }

      const organization = await Organization.findOne({
        code: profileData.organizationCode,
      })
      if (!organization) {
        logError(`Organization not found: ${profileData.organizationCode}`)
        continue
      }

      const existingProfile = await Profile.findOne({
        user: user._id,
        organization: organization._id,
      })

      if (!existingProfile) {
        // Find roles by name
        const roles = await Role.find({
          organization: organization._id,
          name: { $in: profileData.roleNames },
        })

        if (roles.length === 0) {
          logError(`No roles found for profile: ${profileData.userEmail}`)
          continue
        }

        // Collect all permission codes from roles
        const allPermissionCodes = new Set<string>()
        roles.forEach((role) => {
          role.permissionCodes.forEach((code) => allPermissionCodes.add(code))
        })

        await Profile.create({
          user: user._id,
          organization: organization._id,
          roles: roles.map((role) => role._id),
          permissionCodes: Array.from(allPermissionCodes),
        })
        logInfo(
          `Created profile for ${profileData.userEmail} in ${profileData.organizationCode}`
        )
      } else {
        logInfo(
          `Profile already exists for ${profileData.userEmail} in ${profileData.organizationCode}`
        )
      }
    }

    logInfo('Profiles seeded successfully')
  } catch (error) {
    logError(`Error seeding profiles: ${error}`)
    throw error
  }
}
