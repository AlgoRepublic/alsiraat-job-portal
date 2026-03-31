import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

// Import models
import User from "../models/User.js";
import Role from "../models/Role.js";
import Organization from "../models/Organization.js";
import TaskCategory from "../models/TaskCategory.js";
import RewardType from "../models/RewardType.js";
import Task from "../models/Task.js";
import Application from "../models/Application.js";

import PermissionModel from "../models/Permission.js";
import { Permission, RolePermissions } from "../config/permissions.js";

import { UserRole } from "../models/UserRole.js";

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

    // Step 1: Clear all collections
    console.log("\n🗑️  Clearing all collections...");
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not established");

    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`   Cleared: ${collection.name}`);
    }
    console.log("✅ All collections cleared");

    // Step 2: Seed Permissions
    console.log("\n🔑 Seeding permissions...");
    const permDocs = Object.entries(Permission).map(([key, value]) => ({
      code: value,
      name: key.replace(/_/g, " "),
      description: `Allows user to: ${key.replace(/_/g, " ").toLowerCase()}`,
      category: key.split("_")[0],
      isSystem: true,
    }));
    await PermissionModel.insertMany(permDocs);
    console.log(`✅ Seeded ${permDocs.length} permissions`);

    // Step 3: Create Organisation
    console.log("\n🏫 Creating organisation...");
    const organization = (await Organization.create({
      name: "Al Siraat College",
      slug: "al-siraat-college",
      description: "Islamic College in Melbourne",
      contactEmail: "info@alsiraat.edu.au",
      contactPhone: "+61 3 9395 5000",
      isPublic: true,
    } as any)) as any;
    console.log(`✅ Created organisation: ${organization.name}`);

    // Create System organisation for Global Admin
    const systemOrganization = (await Organization.create({
      name: "System",
      slug: "system",
      description: "System-wide organisation for global administration",
      contactEmail: "admin@alsiraat.edu.au",
      contactPhone: "+61 3 9395 5000",
      isPublic: false,
    } as any)) as any;
    console.log(`✅ Created organisation: ${systemOrganization.name}`);

    // Step 4: Seed Roles with Permissions
    console.log("\n👥 Seeding roles with permissions...");

    const rolesData = [
      {
        name: UserRole.GLOBAL_ADMIN,
        code: "global_admin",
        description: "Super administrator with full system access",
        isSystem: true,
        permissions: RolePermissions[UserRole.GLOBAL_ADMIN],
      },
      {
        name: UserRole.SCHOOL_ADMIN,
        code: "school_admin",
        description: "School administrator managing organisation tasks",
        isSystem: true,
        permissions: RolePermissions[UserRole.SCHOOL_ADMIN],
      },
      {
        name: UserRole.TASK_MANAGER,
        code: "task_manager",
        description: "Manages and coordinates tasks within organisation",
        isSystem: true,
        permissions: RolePermissions[UserRole.TASK_MANAGER],
      },
      {
        name: UserRole.TASK_ADVERTISER,
        code: "task_advertiser",
        description: "Creates and advertises tasks",
        isSystem: true,
        permissions: RolePermissions[UserRole.TASK_ADVERTISER],
      },
      {
        name: UserRole.APPLICANT,
        code: "applicant",
        description: "Applies to available tasks",
        isSystem: true,
        permissions: RolePermissions[UserRole.APPLICANT],
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

    const adminUser = (await User.create({
      name: "Super Administrator",
      email: "admin@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.GLOBAL_ADMIN,
      organisation: systemOrganization._id,
      about:
        "Super admin with full system access - can manage all users, roles, permissions, organisations, and tasks",
    } as any)) as any;
    console.log(
      `   Created user: admin@alsiraat.edu.au (SUPER ADMIN - Full Access)`,
    );

    const principalUser = (await User.create({
      name: "Principal Smith",
      email: "principal@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.SCHOOL_ADMIN,
      organisation: organization._id,
    } as any)) as any;
    console.log(`   Created user: principal@alsiraat.edu.au (School Admin)`);

    const coordinatorUser = (await User.create({
      name: "Task Coordinator",
      email: "coordinator@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.TASK_MANAGER,
      organisation: organization._id,
    } as any)) as any;
    console.log(`   Created user: coordinator@alsiraat.edu.au (Task Manager)`);

    const teacherUser = (await User.create({
      name: "Teacher Johnson",
      email: "teacher@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.TASK_ADVERTISER,
      organisation: organization._id,
    } as any)) as any;
    console.log(`   Created user: teacher@alsiraat.edu.au (Task Advertiser)`);

    const studentUser = (await User.create({
      name: "Ahmed Khan",
      email: "student@alsiraat.edu.au",
      password: hashedPassword,
      role: UserRole.APPLICANT,
      organisation: organization._id,
    } as any)) as any;
    console.log(`   Created user: student@alsiraat.edu.au (Applicant)`);

    // Add Crescent High School
    const crescentOrg = (await Organization.create({
      name: "Crescent High School",
      slug: "crescent-high-school",
      description: "A wonderful high school",
      contactEmail: "info@crescent.edu.au",
      contactPhone: "+61 3 9999 0000",
      isPublic: true,
    } as any)) as any;
    console.log(`✅ Created organisation: ${crescentOrg.name}`);

    const crescentAdmin = (await User.create({
      name: "Sarah Principal",
      email: "admin@crescent.edu.au",
      password: hashedPassword,
      role: UserRole.SCHOOL_ADMIN,
      organisation: crescentOrg._id,
    } as any)) as any;
    console.log(`   Created user: admin@crescent.edu.au (School Admin - Crescent)`);

    const crescentStudent = (await User.create({
      name: "Omar Student",
      email: "omar@crescent.edu.au",
      password: hashedPassword,
      role: UserRole.APPLICANT,
      organisation: crescentOrg._id,
    } as any)) as any;
    console.log(`   Created user: omar@crescent.edu.au (Applicant - Crescent)`);

    // Add Minaret College
    const minaretOrg = (await Organization.create({
      name: "Minaret College",
      slug: "minaret-college",
      description: "Excellence in education",
      contactEmail: "info@minaret.edu.au",
      contactPhone: "+61 3 8888 1111",
      isPublic: true,
    } as any)) as any;
    console.log(`✅ Created organisation: ${minaretOrg.name}`);

    const minaretManager = (await User.create({
      name: "Ali Coordinator",
      email: "coordinator@minaret.edu.au",
      password: hashedPassword,
      role: UserRole.TASK_MANAGER,
      organisation: minaretOrg._id,
    } as any)) as any;
    console.log(`   Created user: coordinator@minaret.edu.au (Task Manager - Minaret)`);

    const minaretTeacher = (await User.create({
      name: "Fatima Teacher",
      email: "fatima@minaret.edu.au",
      password: hashedPassword,
      role: UserRole.TASK_ADVERTISER,
      organisation: minaretOrg._id,
    } as any)) as any;
    console.log(`   Created user: fatima@minaret.edu.au (Task Advertiser - Minaret)`);

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
          "Help coordinate and run activities during our annual sports day event. Great task to work with students and families!",
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
        organisation: systemOrganization._id,
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

    console.log("\n" + "=".repeat(70));
    console.log("🔑 SUPER ADMIN LOGIN CREDENTIALS");
    console.log("=".repeat(70));
    console.log(`   Email:    admin@alsiraat.edu.au`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     GLOBAL ADMIN (Full System Access)`);
    console.log("=".repeat(70));
    console.log("\n⚠️  SECURITY WARNING:");
    console.log("   • This account has UNRESTRICTED access to ALL features");
    console.log("   • Can manage users, roles, permissions, and organisations");
    console.log("   • Change password immediately after first login");
    console.log("   • DO NOT use these credentials in production");
    console.log("\n🧪 Additional Test User Credentials:");
    console.log("   [Al Siraat College]");
    console.log("   - principal@alsiraat.edu.au (School Admin)");
    console.log("   - coordinator@alsiraat.edu.au (Task Manager)");
    console.log("   - teacher@alsiraat.edu.au (Task Advertiser)");
    console.log("   - student@alsiraat.edu.au (Applicant)");
    console.log("   [Crescent High School]");
    console.log("   - admin@crescent.edu.au (School Admin)");
    console.log("   - omar@crescent.edu.au (Applicant)");
    console.log("   [Minaret College]");
    console.log("   - coordinator@minaret.edu.au (Task Manager)");
    console.log("   - fatima@minaret.edu.au (Task Advertiser)");
    console.log(`   Password for all users: ${password}`);

    console.log("\n📝 Sample Tasks Created:");
    console.log("   - 3 Pending tasks (2 Internal, 1 Global)");
    console.log("   - 3 Published tasks (1 Internal, 2 Global)");
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
