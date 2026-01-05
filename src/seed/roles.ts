import Role from '@/models/role'
import Organization from '@/models/organization'
import Permission from '@/models/permission'
import { logInfo, logError } from '@/utils/log'

const roles = [
  // Organization Admin - Organization-level management, can approve global tasks
  {
    organizationCode: 'PUBLIC',
    name: 'Organization Admin',
    permissionCodes: [
      // Organizations
      'organization.view',
      'organization.update',
      // Roles
      'role.view',
      'role.create',
      'role.update',
      // Users
      'user.view',
      'user.create',
      'user.update',
      // Profiles
      'profile.view',
      'profile.create',
      'profile.update',
      'profile.search_applicants',
      'profile.view_verified_experience',
      'profile.search_by_hours',
      'profile.search_by_tasks',
      'profile.search_by_availability',
      'profile.review',
      // Permissions
      'permission.view',
      // Tasks - Can approve and manage all school tasks including global
      'task.view',
      'task.create',
      'task.update',
      'task.delete',
      'task.submit',
      'task.approve',
      'task.reject',
      'task.publish',
      'task.unpublish',
      'task.close',
      'task.archive',
      'task.manage_attachments',
      'task.search',
      'task.complete',
      'task.view_applicants',
      // Applications
      'application.view',
      'application.update',
      'application.shortlist',
      'application.offer',
      'application.track',
      'application.view_history',
      // Rewards
      'reward.view',
      'reward.create',
      'reward.update',
      'reward.verify',
      // Skills
      'skill.view',
      'skill.create',
      'skill.update',
      // Reports
      'report.view',
      'report.export',
      'report.analytics',
      // Files
      'file.upload',
      'file.download',
      'file.delete',
      'file.scan',
      'file.manage_versions',
      'file.set_visibility',
      // Notifications
      'notification.view',
      'notification.send',
      // Audit
      'audit.view',
      // Categories
      'category.view',
      'category.create',
      'category.update',
      // Reward Types
      'reward_type.view',
    ],
  },
  // Task Manager - Approve/reject tasks, manage applicants, issue rewards
  {
    organizationCode: 'PUBLIC',
    name: 'Task Manager',
    permissionCodes: [
      // Organizations
      'organization.view',
      // Tasks - Can approve and manage tasks
      'task.view',
      'task.update',
      'task.approve',
      'task.reject',
      'task.publish',
      'task.unpublish',
      'task.close',
      'task.archive',
      'task.manage_attachments',
      'task.search',
      'task.complete',
      'task.view_applicants',
      // Applications - Full management
      'application.view',
      'application.update',
      'application.shortlist',
      'application.offer',
      'application.track',
      'application.view_history',
      // Rewards - Can verify and issue
      'reward.view',
      'reward.create',
      'reward.update',
      'reward.verify',
      // Skills
      'skill.view',
      // Profiles - Can search applicants
      'profile.view',
      'profile.search_applicants',
      'profile.view_verified_experience',
      'profile.search_by_hours',
      'profile.search_by_tasks',
      'profile.search_by_availability',
      'profile.review',
      // Reports
      'report.view',
      'report.export',
      // Files
      'file.upload',
      'file.download',
      'file.delete',
      'file.manage_versions',
      'file.set_visibility',
      // Notifications
      'notification.view',
      'notification.send',
    ],
  },
  // Task Advertiser/Poster - Create and submit tasks
  {
    organizationCode: 'PUBLIC',
    name: 'Task Advertiser',
    permissionCodes: [
      // Organizations
      'organization.view',
      // Tasks - Can create and submit
      'task.view',
      'task.create',
      'task.update',
      'task.submit',
      'task.manage_attachments',
      'task.search',
      'task.view_applicants',
      // Applications - Can view applications to their tasks
      'application.view',
      'application.track',
      // Skills
      'skill.view',
      // Files
      'file.upload',
      'file.download',
      // Notifications
      'notification.view',
    ],
  },
  // Applicant - Search, apply, manage profile
  {
    organizationCode: 'PUBLIC',
    name: 'Applicant',
    permissionCodes: [
      // Organizations
      'organization.view',
      // Tasks - Can search and view
      'task.view',
      'task.search',
      // Applications - Can create and manage own applications
      'application.view',
      'application.create',
      'application.update',
      'application.accept',
      'application.decline',
      'application.track',
      'application.view_history',
      // Rewards - Can view own rewards
      'reward.view',
      // Skills - Can manage own skills
      'skill.view',
      'skill.create',
      'skill.update',
      // Profile - Can manage own profile
      'profile.view',
      'profile.manage_own',
      'profile.view_verified_experience',
      // Files - Can upload resume/cover letter
      'file.upload',
      'file.download',
      // Notifications
      'notification.view',
    ],
  },
]

export const seedRoles = async (): Promise<void> => {
  try {
    logInfo('Seeding roles...')

    for (const roleData of roles) {
      const organization = await Organization.findOne({
        code: roleData.organizationCode,
      })

      if (!organization) {
        logError(`Organization not found: ${roleData.organizationCode}`)
        continue
      }

      const existingRole = await Role.findOne({
        organization: organization._id,
        name: roleData.name,
      })

      if (!existingRole) {
        // Verify all permission codes exist
        const permissions = await Permission.find({
          code: { $in: roleData.permissionCodes },
        })

        if (permissions.length !== roleData.permissionCodes.length) {
          const foundCodes = permissions.map((p) => p.code)
          const missingCodes = roleData.permissionCodes.filter(
            (code) => !foundCodes.includes(code)
          )
          logError(
            `Missing permissions for role ${roleData.name}: ${missingCodes.join(', ')}`
          )
          continue
        }

        await Role.create({
          organization: organization._id,
          name: roleData.name,
          permissionCodes: roleData.permissionCodes,
          createdByType: 'system',
        })
        logInfo(
          `Created role: ${roleData.name} in ${roleData.organizationCode}`
        )
      } else {
        logInfo(
          `Role already exists: ${roleData.name} in ${roleData.organizationCode}`
        )
      }
    }

    logInfo('Roles seeded successfully')
  } catch (error) {
    logError(`Error seeding roles: ${error}`)
    throw error
  }
}
