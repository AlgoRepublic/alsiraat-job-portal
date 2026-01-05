import User from '@/models/user'
import { encryptPassword } from '@/utils/password'
import { logInfo, logError } from '@/utils/log'

const users = [
  {
    name: 'Admin',
    email: 'admin@example.com',
    password: 'password@123',
    isAdmin: true,
  },
  {
    name: 'Organization Admin',
    email: 'orgadmin@example.com',
    password: 'password@123',
    isAdmin: false,
  },
  {
    name: 'Task Manager',
    email: 'taskmanager@example.com',
    password: 'password@123',
    isAdmin: false,
  },
  {
    name: 'Task Advertiser',
    email: 'taskadvertiser@example.com',
    password: 'password@123',
    isAdmin: false,
  },
  {
    name: 'Applicant',
    email: 'applicant@example.com',
    password: 'password@123',
    isAdmin: false,
  },
]

export const seedUsers = async (): Promise<void> => {
  try {
    logInfo('Seeding users...')

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email })

      if (!existingUser) {
        const encryptedPassword = await encryptPassword(userData.password)
        await User.create({
          name: userData.name,
          email: userData.email,
          encryptedPassword,
          isAdmin: userData.isAdmin,
        })
        logInfo(`Created user: ${userData.email}`)
      } else {
        logInfo(`User already exists: ${userData.email}`)
      }
    }

    logInfo('Users seeded successfully')
  } catch (error) {
    logError(`Error seeding users: ${error}`)
    throw error
  }
}
