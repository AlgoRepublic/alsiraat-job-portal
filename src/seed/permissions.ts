import Permission from '@/models/permission'
import { logInfo, logError } from '@/utils/log'

const permissions = [
  // Organizations
  {
    entity: 'organization',
    name: 'View Organizations',
    code: 'organization.view',
    position: 1,
  },
  {
    entity: 'organization',
    name: 'Create Organizations',
    code: 'organization.create',
    position: 2,
  },
  {
    entity: 'organization',
    name: 'Update Organizations',
    code: 'organization.update',
    position: 3,
  },
  {
    entity: 'organization',
    name: 'Delete Organizations',
    code: 'organization.delete',
    position: 4,
  },

  // Roles
  { entity: 'role', name: 'View Roles', code: 'role.view', position: 1 },
  { entity: 'role', name: 'Create Roles', code: 'role.create', position: 2 },
  { entity: 'role', name: 'Update Roles', code: 'role.update', position: 3 },
  { entity: 'role', name: 'Delete Roles', code: 'role.delete', position: 4 },

  // Users
  { entity: 'user', name: 'View Users', code: 'user.view', position: 1 },
  { entity: 'user', name: 'Create Users', code: 'user.create', position: 2 },
  { entity: 'user', name: 'Update Users', code: 'user.update', position: 3 },
  { entity: 'user', name: 'Delete Users', code: 'user.delete', position: 4 },

  // Profiles
  {
    entity: 'profile',
    name: 'View Profiles',
    code: 'profile.view',
    position: 1,
  },
  {
    entity: 'profile',
    name: 'Create Profiles',
    code: 'profile.create',
    position: 2,
  },
  {
    entity: 'profile',
    name: 'Update Profiles',
    code: 'profile.update',
    position: 3,
  },
  {
    entity: 'profile',
    name: 'Delete Profiles',
    code: 'profile.delete',
    position: 4,
  },

  // Permissions
  {
    entity: 'permission',
    name: 'View Permissions',
    code: 'permission.view',
    position: 1,
  },

  // Tasks - Task Publishing and Management
  {
    entity: 'task',
    name: 'View Tasks',
    code: 'task.view',
    position: 1,
  },
  {
    entity: 'task',
    name: 'Create Tasks',
    code: 'task.create',
    position: 2,
  },
  {
    entity: 'task',
    name: 'Update Tasks',
    code: 'task.update',
    position: 3,
  },
  {
    entity: 'task',
    name: 'Delete Tasks',
    code: 'task.delete',
    position: 4,
  },
  {
    entity: 'task',
    name: 'Submit Tasks for Review',
    code: 'task.submit',
    position: 5,
  },
  {
    entity: 'task',
    name: 'Approve Tasks',
    code: 'task.approve',
    position: 6,
  },
  {
    entity: 'task',
    name: 'Reject Tasks',
    code: 'task.reject',
    position: 7,
  },
  {
    entity: 'task',
    name: 'Publish Tasks',
    code: 'task.publish',
    position: 8,
  },
  {
    entity: 'task',
    name: 'Unpublish Tasks',
    code: 'task.unpublish',
    position: 9,
  },
  {
    entity: 'task',
    name: 'Close Tasks',
    code: 'task.close',
    position: 10,
  },
  {
    entity: 'task',
    name: 'Archive Tasks',
    code: 'task.archive',
    position: 11,
  },
  {
    entity: 'task',
    name: 'Manage Task Attachments',
    code: 'task.manage_attachments',
    position: 12,
  },
  {
    entity: 'task',
    name: 'Search Tasks',
    code: 'task.search',
    position: 13,
  },
  {
    entity: 'task',
    name: 'Mark Task as Complete',
    code: 'task.complete',
    position: 14,
  },
  {
    entity: 'task',
    name: 'View Task Applicants',
    code: 'task.view_applicants',
    position: 15,
  },

  // Applications
  {
    entity: 'application',
    name: 'View Applications',
    code: 'application.view',
    position: 1,
  },
  {
    entity: 'application',
    name: 'Create Applications (Apply)',
    code: 'application.create',
    position: 2,
  },
  {
    entity: 'application',
    name: 'Update Applications',
    code: 'application.update',
    position: 3,
  },
  {
    entity: 'application',
    name: 'Delete Applications',
    code: 'application.delete',
    position: 4,
  },
  {
    entity: 'application',
    name: 'Shortlist Applications',
    code: 'application.shortlist',
    position: 5,
  },
  {
    entity: 'application',
    name: 'Send Offers',
    code: 'application.offer',
    position: 6,
  },
  {
    entity: 'application',
    name: 'Accept Offers',
    code: 'application.accept',
    position: 7,
  },
  {
    entity: 'application',
    name: 'Decline Offers',
    code: 'application.decline',
    position: 8,
  },
  {
    entity: 'application',
    name: 'Track Application Status',
    code: 'application.track',
    position: 9,
  },
  {
    entity: 'application',
    name: 'View Application History',
    code: 'application.view_history',
    position: 10,
  },

  // Rewards
  {
    entity: 'reward',
    name: 'View Rewards',
    code: 'reward.view',
    position: 1,
  },
  {
    entity: 'reward',
    name: 'Issue Rewards',
    code: 'reward.create',
    position: 2,
  },
  {
    entity: 'reward',
    name: 'Update Rewards',
    code: 'reward.update',
    position: 3,
  },
  {
    entity: 'reward',
    name: 'Delete Rewards',
    code: 'reward.delete',
    position: 4,
  },
  {
    entity: 'reward',
    name: 'Verify Task Completion',
    code: 'reward.verify',
    position: 5,
  },

  // Skills and Profile Management
  {
    entity: 'skill',
    name: 'View Skills',
    code: 'skill.view',
    position: 1,
  },
  {
    entity: 'skill',
    name: 'Create Skills',
    code: 'skill.create',
    position: 2,
  },
  {
    entity: 'skill',
    name: 'Update Skills',
    code: 'skill.update',
    position: 3,
  },
  {
    entity: 'skill',
    name: 'Delete Skills',
    code: 'skill.delete',
    position: 4,
  },
  {
    entity: 'profile',
    name: 'Manage Own Profile',
    code: 'profile.manage_own',
    position: 5,
  },
  {
    entity: 'profile',
    name: 'Search Applicants by Skills',
    code: 'profile.search_applicants',
    position: 6,
  },
  {
    entity: 'profile',
    name: 'View Verified Experience',
    code: 'profile.view_verified_experience',
    position: 7,
  },
  {
    entity: 'profile',
    name: 'Search Applicants by Verified Hours',
    code: 'profile.search_by_hours',
    position: 8,
  },
  {
    entity: 'profile',
    name: 'Search Applicants by Completed Tasks',
    code: 'profile.search_by_tasks',
    position: 9,
  },
  {
    entity: 'profile',
    name: 'Search Applicants by Availability',
    code: 'profile.search_by_availability',
    position: 10,
  },
  {
    entity: 'profile',
    name: 'Review Applicant Profiles and Resumes',
    code: 'profile.review',
    position: 11,
  },

  // Reports and Analytics
  {
    entity: 'report',
    name: 'View Reports',
    code: 'report.view',
    position: 1,
  },
  {
    entity: 'report',
    name: 'Export Reports',
    code: 'report.export',
    position: 2,
  },
  {
    entity: 'report',
    name: 'View Analytics',
    code: 'report.analytics',
    position: 3,
  },

  // Files and Attachments
  {
    entity: 'file',
    name: 'Upload Files',
    code: 'file.upload',
    position: 1,
  },
  {
    entity: 'file',
    name: 'Download Files',
    code: 'file.download',
    position: 2,
  },
  {
    entity: 'file',
    name: 'Delete Files',
    code: 'file.delete',
    position: 3,
  },
  {
    entity: 'file',
    name: 'Scan Files (Virus Scanning)',
    code: 'file.scan',
    position: 4,
  },
  {
    entity: 'file',
    name: 'Manage File Versions',
    code: 'file.manage_versions',
    position: 5,
  },
  {
    entity: 'file',
    name: 'Set File Visibility (Internal/Public)',
    code: 'file.set_visibility',
    position: 6,
  },

  // Notifications
  {
    entity: 'notification',
    name: 'View Notifications',
    code: 'notification.view',
    position: 1,
  },
  {
    entity: 'notification',
    name: 'Send Notifications',
    code: 'notification.send',
    position: 2,
  },

  // Audit and Security
  {
    entity: 'audit',
    name: 'View Audit Logs',
    code: 'audit.view',
    position: 1,
  },
  {
    entity: 'audit',
    name: 'Export Audit Logs',
    code: 'audit.export',
    position: 2,
  },

  // Tenant/Organization Management (Global Admin)
  {
    entity: 'tenant',
    name: 'View Tenants',
    code: 'tenant.view',
    position: 1,
  },
  {
    entity: 'tenant',
    name: 'Create Tenants',
    code: 'tenant.create',
    position: 2,
  },
  {
    entity: 'tenant',
    name: 'Update Tenants',
    code: 'tenant.update',
    position: 3,
  },
  {
    entity: 'tenant',
    name: 'Delete Tenants',
    code: 'tenant.delete',
    position: 4,
  },
  {
    entity: 'tenant',
    name: 'Suspend Tenants',
    code: 'tenant.suspend',
    position: 5,
  },
  {
    entity: 'tenant',
    name: 'Manage Tenant Branding',
    code: 'tenant.manage_branding',
    position: 6,
  },
  {
    entity: 'tenant',
    name: 'Manage Tenant Settings',
    code: 'tenant.manage_settings',
    position: 7,
  },

  // Categories
  {
    entity: 'category',
    name: 'View Categories',
    code: 'category.view',
    position: 1,
  },
  {
    entity: 'category',
    name: 'Create Categories',
    code: 'category.create',
    position: 2,
  },
  {
    entity: 'category',
    name: 'Update Categories',
    code: 'category.update',
    position: 3,
  },
  {
    entity: 'category',
    name: 'Delete Categories',
    code: 'category.delete',
    position: 4,
  },

  // Reward Types
  {
    entity: 'reward_type',
    name: 'View Reward Types',
    code: 'reward_type.view',
    position: 1,
  },
  {
    entity: 'reward_type',
    name: 'Create Reward Types',
    code: 'reward_type.create',
    position: 2,
  },
  {
    entity: 'reward_type',
    name: 'Update Reward Types',
    code: 'reward_type.update',
    position: 3,
  },
  {
    entity: 'reward_type',
    name: 'Delete Reward Types',
    code: 'reward_type.delete',
    position: 4,
  },

  // Global Settings
  {
    entity: 'settings',
    name: 'View Settings',
    code: 'settings.view',
    position: 1,
  },
  {
    entity: 'settings',
    name: 'Update Settings',
    code: 'settings.update',
    position: 2,
  },
  {
    entity: 'settings',
    name: 'Manage Global Categories',
    code: 'settings.manage_categories',
    position: 3,
  },
  {
    entity: 'settings',
    name: 'Manage Global Skills',
    code: 'settings.manage_skills',
    position: 4,
  },
  {
    entity: 'settings',
    name: 'Manage Reward Types',
    code: 'settings.manage_reward_types',
    position: 5,
  },
  {
    entity: 'settings',
    name: 'Manage File Limits',
    code: 'settings.manage_file_limits',
    position: 6,
  },
  {
    entity: 'settings',
    name: 'Manage Public Marketplace Settings',
    code: 'settings.manage_marketplace',
    position: 7,
  },
]

export const seedPermissions = async (): Promise<void> => {
  try {
    logInfo('Seeding permissions...')

    for (const permissionData of permissions) {
      const existingPermission = await Permission.findOne({
        code: permissionData.code,
      })

      if (!existingPermission) {
        await Permission.create(permissionData)
        logInfo(`Created permission: ${permissionData.code}`)
      } else {
        logInfo(`Permission already exists: ${permissionData.code}`)
      }
    }

    logInfo('Permissions seeded successfully')
  } catch (error) {
    logError(`Error seeding permissions: ${error}`)
    throw error
  }
}
