import Organization from '@/models/organization'
import { logInfo, logError } from '@/utils/log'

const organizations = [
  {
    name: 'Public Organization',
    code: 'PUBLIC',
    logo: null,
    colorPalette: {
      primary: '#0066cc',
      secondary: '#ffffff',
      accent: '#00cc66',
    },
    loginWelcomeText: 'Welcome to Public Organization',
    footerText: '© 2024 Public Organization',
    bannerImages: [],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerTask: 3,
    offerExpiryDays: 7,
    isSuspended: false,
    isPublic: true,
    allowGlobalTasks: false,
    allowExternalTasks: false,
  },
]

export const seedOrganizations = async (): Promise<void> => {
  try {
    logInfo('Seeding organizations...')

    for (const orgData of organizations) {
      const existingOrg = await Organization.findOne({ code: orgData.code })

      if (!existingOrg) {
        await Organization.create(orgData)
        logInfo(`Created organization: ${orgData.name} (${orgData.code})`)
      } else {
        logInfo(
          `Organization already exists: ${orgData.name} (${orgData.code})`
        )
      }
    }

    logInfo('Organizations seeded successfully')
  } catch (error) {
    logError(`Error seeding organizations: ${error}`)
    throw error
  }
}
