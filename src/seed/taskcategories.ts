import TaskCategory from '@/models/taskcategory'
import Organization from '@/models/organization'
import { logInfo, logError } from '@/utils/log'

const taskCategories = [
  {
    name: 'Event Management',
    description:
      'Tasks related to planning, organizing, and managing events such as school functions, community gatherings, and special occasions.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Administrative Support',
    description:
      'Office and administrative tasks including data entry, filing, document preparation, and general office assistance.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Marketing & Communications',
    description:
      'Tasks involving social media management, content creation, graphic design, newsletter writing, and promotional activities.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'IT & Technology',
    description:
      'Technical tasks including website maintenance, software support, hardware setup, and digital infrastructure management.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Facilities & Maintenance',
    description:
      'Tasks related to building maintenance, cleaning, repairs, landscaping, and facility management.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Education & Tutoring',
    description:
      'Educational tasks including tutoring, curriculum development, workshop facilitation, and student support activities.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Community Service',
    description:
      'Volunteer and community engagement tasks including outreach programs, charity work, and community development initiatives.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Research & Analysis',
    description:
      'Tasks involving data collection, research, analysis, report writing, and information gathering.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Customer Service',
    description:
      'Tasks related to customer support, inquiry handling, reception duties, and client communication.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
  {
    name: 'Creative & Design',
    description:
      'Creative tasks including photography, videography, design work, art projects, and multimedia content creation.',
    isGlobal: false,
    organizationCode: 'PUBLIC',
  },
]

export const seedTaskCategories = async (): Promise<void> => {
  try {
    logInfo('Seeding task categories...')

    for (const categoryData of taskCategories) {
      // Find the organization by code
      const organization = await Organization.findOne({
        code: categoryData.organizationCode,
      }).exec()

      if (!organization) {
        logError(
          `Organization with code ${categoryData.organizationCode} not found. Skipping category: ${categoryData.name}`
        )
        continue
      }

      // Check if category already exists
      const existingCategory = await TaskCategory.findOne({
        name: categoryData.name,
        organization: organization._id,
        deletedAt: null,
      }).exec()

      if (!existingCategory) {
        await TaskCategory.create({
          name: categoryData.name,
          description: categoryData.description,
          isGlobal: categoryData.isGlobal,
          organization: organization._id,
          createdBy: null,
          createdByType: 'system',
          createdByProfile: null,
        })
        logInfo(
          `Created task category: ${categoryData.name} for ${organization.name}`
        )
      } else {
        logInfo(
          `Task category already exists: ${categoryData.name} for ${organization.name}`
        )
      }
    }

    logInfo('Task categories seeded successfully')
  } catch (error) {
    logError(`Error seeding task categories: ${error}`)
    throw error
  }
}
