import '@/utils/keys'
import '@/utils/dotenv'
import { mongooseConnection } from '@/config/db'
import { logInfo, logError } from '@/utils/log'
import { seedPermissions } from '@/seed/permissions'
import { seedOrganizations } from '@/seed/organizations'
import { seedUsers } from '@/seed/users'
import { seedRoles } from '@/seed/roles'
import { seedProfiles } from '@/seed/profiles'
import { seedTaskCategories } from '@/seed/taskcategories'

const runSeed = async (): Promise<void> => {
  try {
    logInfo('Starting seed process...')

    // Connect to database
    await mongooseConnection()
    logInfo('Database connected')

    // Seed in order (respecting dependencies)
    await seedPermissions()
    await seedOrganizations()
    await seedUsers()
    await seedRoles()
    await seedProfiles()
    await seedTaskCategories()

    logInfo('Seed process completed successfully')
    process.exit(0)
  } catch (error) {
    logError(`Seed process failed: ${error}`)
    process.exit(1)
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  runSeed()
}

export { runSeed }
