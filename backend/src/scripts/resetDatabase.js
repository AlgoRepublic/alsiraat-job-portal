import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

// Import models
import User from "../models/User.ts";
import Role from "../models/Role.ts";
import Organization from "../models/Organization.ts";
import TaskCategory from "../models/TaskCategory.ts";
import RewardType from "../models/RewardType.ts";
import Task from "../models/Task.ts";
import Application from "../models/Application.ts";

// Enums
const UserRole = {
  GLOBAL_ADMIN: "Global Admin",
  SCHOOL_ADMIN: "School Admin",
  TASK_MANAGER: "Task Manager",
  TASK_ADVERTISER: "Task Advertiser",
  APPLICANT: "Applicant",
};

const Permission = {
  // Task permissions
  TASK_CREATE: "task:create",
  VIEW_ALL_TASKS: "view_all_tasks",
  VIEW_ORG_TASKS: "view_org_tasks",
  EDIT_TASK: "edit_task",
  DELETE_TASK: "delete_task",
  APPROVE_TASK: "approve_task",
  PUBLISH_TASK: "publish_task",

  // Application permissions
  APPLICATION_CREATE: "application:create",
  APPLICATION_READ: "application:read",
  APPLICATION_READ_OWN: "application:read_own",
  VIEW_APPLICATIONS: "view_applications",
  REVIEW_APPLICATIONS: "review_applications",

  // User management
  MANAGE_USERS: "manage_users",
  VIEW_USERS: "view_users",

  // Organisation management
  MANAGE_ORGANISATION: "manage_organisation",

  // Role management
  MANAGE_ROLES: "manage_roles",
  MANAGE_PERMISSIONS: "manage_permissions",
};

const TaskStatus = {
  PENDING: "Pending",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const TaskVisibility = {
  INTERNAL: "Internal",
  GLOBAL: "Global",
};

const MONGODB_URI =
  // "mongodb://tasker:WdE0urFVi93pYYOLOzUGn7AGgvfFhe2adPaSj49kbqgG_3IG@1023b557-eaa1-419e-bd02-4df4d15f4409.africa-south1.firestore.goog:443/alsiraat-tasker?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false";
  "mongodb://localhost:27017/tasker";

async function resetDatabase() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Step 1: Drop all collections
    console.log("\n🗑️  Dropping all collections...");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`   Dropped: ${collection.name}`);
    }
    console.log("✅ All collections dropped");

    // Step 2: Create Organisation
    console.log("\n🏫 Creating organisation...");
    const organization = await Organization.create({
      name: "Al Siraat College",
      slug: "al-siraat-college",
      description: "Islamic College in Melbourne",
      contactEmail: "info@alsiraat.edu.au",
      contactPhone: "+61 3 9395 5000",
      isPublic: true,
    });
    console.log(`✅ Created organisation: ${organization.name}`);

    // Step 3: Seed Roles with Permissions
    console.log("\n👥 Seeding roles with permissions...");

    const rolesData = [
      {
        name: UserRole.GLOBAL_ADMIN,
        code: "global_admin",
        description: "Super administrator with full system access",
        isSystem: true,
        permissions: [
          "task:create",
          "task:read",
          "task:update",
          "task:delete",
          "task:submit",
          "task:approve",
          "task:publish",
          "task:archive",
          "application:create",
          "application:read",
          "application:read_own",
          "application:shortlist",
          "application:approve",
          "application:reject",
          "user:read",
          "user:update",
          "user:delete",
          "user:impersonate",
          "user:manage_roles",
          "org:create",
          "org:read",
          "org:update",
          "org:delete",
          "org:manage_members",
          "dashboard:view",
          "analytics:view",
          "reports:view",
          "reports:export",
          "reports:create",
          "admin:settings",
          "admin:audit_log",
          "application:confirm",
          "application:reject",
        ],
      },
      {
        name: UserRole.SCHOOL_ADMIN,
        code: "school_admin",
        description: "School administrator managing organisation tasks",
        isSystem: true,
        permissions: [
          "task:create",
          "task:read",
          "task:update",
          "task:delete",
          "task:submit",
          "task:approve",
          "task:publish",
          "task:archive",
          "application:read",
          "application:shortlist",
          "application:approve",
          "application:reject",
          "org:read",
          "org:update",
          "org:manage_members",
          "user:read",
          "user:update",
          "user:manage_roles",
          "dashboard:view",
          "analytics:view",
          "reports:view",
          "admin:settings",
        ],
      },
      {
        name: UserRole.TASK_MANAGER,
        code: "task_manager",
        description: "Manages and coordinates tasks within organisation",
        isSystem: true,
        permissions: [
          "task:read",
          "task:approve",
          "task:publish",
          "application:read",
          "application:shortlist",
          "application:approve",
          "application:reject",
          "dashboard:view",
        ],
      },
      {
        name: UserRole.TASK_ADVERTISER,
        code: "task_advertiser",
        description: "Creates and advertises tasks",
        isSystem: true,
        permissions: [
          "task:create",
          "task:read",
          "task:update",
          "task:submit",
          "application:read_own",
        ],
      },
      {
        name: UserRole.APPLICANT,
        code: "applicant",
        description: "Applies to available tasks",
        isSystem: true,
        permissions: [
          "task:read",
          "application:create",
          "application:read_own",
          "application:confirm",
          "application:reject",
        ],
      },
    ];

    for (const roleData of rolesData) {
      await Role.create(roleData);
      console.log(
        `   Created role: ${roleData.name} (${roleData.permissions.length} permissions)`,
      );
    }
    console.log("✅ All roles created");

    // Step 4: Create Test Users
    console.log("\n👤 Creating test users...");
    const password = "Test@123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      name: "Global Admin",
      email: "admin@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.GLOBAL_ADMIN,
      organization: null,
    });
    console.log(`   Created user: admin@alsiraat.edu.au (Global Admin)`);

    const principalUser = await User.create({
      name: "Principal Smith",
      email: "principal@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.SCHOOL_ADMIN,
      organization: organization._id,
    });
    console.log(`   Created user: principal@alsiraat.edu.au (School Admin)`);

    const coordinatorUser = await User.create({
      name: "Task Coordinator",
      email: "coordinator@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.TASK_MANAGER,
      organization: organization._id,
    });
    console.log(`   Created user: coordinator@alsiraat.edu.au (Task Manager)`);

    const teacherUser = await User.create({
      name: "Teacher Johnson",
      email: "teacher@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.TASK_ADVERTISER,
      organization: organization._id,
    });
    console.log(`   Created user: teacher@alsiraat.edu.au (Task Advertiser)`);

    const studentUser = await User.create({
      name: "Student Independent",
      email: "student@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.APPLICANT,
      organization: null,
    });
    console.log(`   Created user: student@alsiraat.edu.au (Applicant)`);

    console.log("✅ All test users created");
    console.log(`   Password for all users: ${password}`);

    // Step 5: Seed Task Categories
    console.log("\n📂 Seeding task categories...");
    const categories = [
      {
        code: "academic_support",
        name: "Academic Support",
        description: "Tutoring and academic assistance",
        icon: "📚",
      },
      {
        code: "community_service",
        name: "Community Service",
        description: "Volunteer and community work",
        icon: "🤝",
      },
      {
        code: "event_support",
        name: "Event Support",
        description: "Help with school events",
        icon: "🎉",
      },
      {
        code: "administrative",
        name: "Administrative",
        description: "Office and admin tasks",
        icon: "📋",
      },
      {
        code: "technology",
        name: "Technology",
        description: "IT and tech support",
        icon: "💻",
      },
      {
        code: "maintenance",
        name: "Maintenance",
        description: "Facility maintenance tasks",
        icon: "🔧",
      },
      {
        code: "creative",
        name: "Creative",
        description: "Design and creative projects",
        icon: "🎨",
      },
      {
        code: "sports_recreation",
        name: "Sports & Recreation",
        description: "Sports and physical activities",
        icon: "⚽",
      },
    ];

    for (const category of categories) {
      await TaskCategory.create(category);
      console.log(`   Created category: ${category.name}`);
    }
    console.log("✅ All categories created");

    // Step 6: Seed Reward Types
    console.log("\n🎁 Seeding reward types...");
    const rewardTypes = [
      {
        code: "hourly",
        name: "Hourly",
        description: "Payment per hour",
        requiresValue: true,
        icon: "⏰",
      },
      {
        code: "lumpsum",
        name: "Lumpsum",
        description: "One-off payment",
        requiresValue: true,
        icon: "💰",
      },
      {
        code: "voucher",
        name: "Voucher",
        description: "Gift voucher",
        requiresValue: true,
        icon: "🎟️",
      },
      {
        code: "via_hours",
        name: "VIA Hours",
        description: "Values in Action hours",
        requiresValue: true,
        icon: "🤝",
      },
      {
        code: "community_recognition",
        name: "Community service recognition",
        description: "Recognition for service",
        requiresValue: false,
        icon: "🏅",
      },
    ];

    for (const rewardType of rewardTypes) {
      await RewardType.create(rewardType);
      console.log(`   Created reward type: ${rewardType.name}`);
    }
    console.log("✅ All reward types created");

    // Step 7: Seed Sample Tasks
    console.log("\n📝 Seeding sample tasks...");

    const sampleTasks = [
      // Pending Internal Task (School Admin/Task Manager can approve)
      {
        title: "Library Assistant Needed",
        description:
          "Help organize books and assist students in the library during lunch breaks.",
        category: "Academic Support",
        location: "School Library",
        hoursRequired: 5,
        startDate: new Date("2026-02-10"),
        endDate: new Date("2026-03-10"),
        selectionCriteria: "Organized, patient, and good with students",
        requiredSkills: ["Organization", "Communication"],
        rewardType: "VIA Hours",
        rewardValue: 5,
        eligibility: ["Students", "Staff"],
        visibility: TaskVisibility.INTERNAL,
        organisation: organization._id,
        status: TaskStatus.PENDING,
        createdBy: principalUser._id,
        attachments: [],
      },
      // Pending Global Task (Only Global Admin can approve)
      {
        title: "Community Cleanup Drive",
        description:
          "Join us for a community cleanup event in the local park. Help make our neighborhood cleaner and greener!",
        category: "Community Service",
        location: "Central Park",
        hoursRequired: 3,
        startDate: new Date("2026-02-15"),
        endDate: new Date("2026-02-15"),
        selectionCriteria: "Enthusiastic volunteers willing to help",
        requiredSkills: ["Teamwork"],
        rewardType: "VIA Hours",
        rewardValue: 3,
        eligibility: ["Students", "Parents", "Staff", "Public"],
        visibility: TaskVisibility.GLOBAL,
        organisation: organization._id,
        status: TaskStatus.PENDING,
        createdBy: coordinatorUser._id,
        attachments: [],
      },
      // Published Internal Task (Visible to org members only)
      {
        title: "Math Tutoring for Year 7",
        description:
          "Provide one-on-one math tutoring for Year 7 students struggling with algebra.",
        category: "Academic Support",
        location: "Tutoring Center",
        hoursRequired: 10,
        startDate: new Date("2026-02-08"),
        endDate: new Date("2026-04-08"),
        selectionCriteria: "Strong math skills, patient teaching style",
        requiredSkills: ["Mathematics", "Teaching", "Patience"],
        rewardType: "VIA Hours",
        rewardValue: 2,
        eligibility: ["Students", "Staff"],
        visibility: TaskVisibility.INTERNAL,
        organisation: organization._id,
        status: TaskStatus.PUBLISHED,
        createdBy: teacherUser._id,
        attachments: [],
      },
      // Published Global Task (Visible to everyone)
      {
        title: "Sports Day Volunteer",
        description:
          "Help coordinate and run activities during our annual sports day event. Great opportunity to work with students and families!",
        category: "Event Support",
        location: "School Oval",
        hoursRequired: 6,
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-01"),
        selectionCriteria: "Energetic, organized, good with children",
        requiredSkills: ["Event Management", "Communication", "Teamwork"],
        rewardType: "Community service recognition",
        rewardValue: 1,
        eligibility: ["Students", "Parents", "Staff", "Public"],
        visibility: TaskVisibility.GLOBAL,
        organisation: organization._id,
        status: TaskStatus.PUBLISHED,
        createdBy: coordinatorUser._id,
        attachments: [],
      },
      // Another Pending Internal Task
      {
        title: "IT Support Assistant",
        description:
          "Assist with basic IT troubleshooting and help staff with technology issues.",
        category: "Technology",
        location: "IT Department",
        hoursRequired: 8,
        startDate: new Date("2026-02-12"),
        endDate: new Date("2026-05-12"),
        selectionCriteria: "Basic computer skills, problem-solving ability",
        requiredSkills: ["IT Support", "Problem Solving", "Communication"],
        rewardType: "Community service recognition",
        rewardValue: 1,
        eligibility: ["Students", "Staff"],
        visibility: TaskVisibility.INTERNAL,
        organisation: organization._id,
        status: TaskStatus.PENDING,
        createdBy: teacherUser._id,
        attachments: [],
      },
      // Published Global Task created by Global Admin
      {
        title: "Charity Fundraiser Event",
        description:
          "Help organize and run a charity fundraiser event to support local families in need.",
        category: "Community Service",
        location: "Community Hall",
        hoursRequired: 4,
        startDate: new Date("2026-02-20"),
        endDate: new Date("2026-02-20"),
        selectionCriteria:
          "Passionate about helping others, good communication skills",
        requiredSkills: ["Event Planning", "Communication", "Fundraising"],
        rewardType: "VIA Hours",
        rewardValue: 4,
        eligibility: ["Students", "Parents", "Staff", "Public"],
        visibility: TaskVisibility.GLOBAL,
        organisation: null,
        status: TaskStatus.PUBLISHED,
        createdBy: teacherUser._id,
        attachments: [],
      },
    ];

    for (const taskData of sampleTasks) {
      const task = await Task.create(taskData);
      console.log(
        `   Created task: ${task.title} (${task.visibility}, ${task.status})`,
      );
    }
    console.log("✅ All sample tasks created");

    // Step 8: Verification
    console.log("\n✅ Database reset complete!");
    console.log("\n📊 Summary:");
    console.log(`   Organisations: ${await Organization.countDocuments()}`);
    console.log(`   Roles: ${await Role.countDocuments()}`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Categories: ${await TaskCategory.countDocuments()}`);
    console.log(`   Reward Types: ${await RewardType.countDocuments()}`);
    console.log(`   Tasks: ${await Task.countDocuments()}`);
    console.log(`   Applications: ${await Application.countDocuments()}`);

    console.log("\n🔑 Test User Credentials:");
    console.log("   Email: admin@alsiraat.edu.au (Global Admin)");
    console.log("   Email: principal@alsiraat.edu.au (School Admin)");
    console.log("   Email: coordinator@alsiraat.edu.au (Task Manager)");
    console.log("   Email: teacher@alsiraat.edu.au (Task Advertiser)");
    console.log("   Email: student@alsiraat.edu.au (Applicant - Independent)");
    console.log(`   Password: ${password}`);

    console.log("\n📝 Sample Tasks Created:");
    console.log("   - 3 Pending tasks (2 Internal, 1 Global)");
    console.log("   - 3 Published tasks (1 Internal, 2 Global)");
    console.log("\n💡 Testing Tips:");
    console.log(
      "   - Login as Applicant: Should see ONLY 2 Published Global tasks",
    );
    console.log("   - Login as Teacher: Should see all 6 tasks (org member)");
    console.log(
      "   - Login as Principal: Can approve 2 Pending Internal tasks",
    );
    console.log("   - Login as Admin: Can approve ALL 3 Pending tasks");
  } catch (error) {
    console.error("\n❌ Error resetting database:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
resetDatabase()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
