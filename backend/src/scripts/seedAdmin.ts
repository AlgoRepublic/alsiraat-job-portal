import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User, { UserRole } from "../models/User.js";
import Organization from "../models/Organization.js";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import Application from "../models/Application.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

const DEFAULT_PASSWORD = "Test@123!";

// =====================
// ORGANIZATIONS
// =====================
const ORGANIZATIONS = [
  {
    name: "Al-Siraat College",
    slug: "alsiraat",
    type: "School",
    about:
      "An Islamic College in the heart of Melbourne, nurturing future leaders.",
    settings: {
      allowExternalApplications: true,
      requireApprovalForPosts: true,
    },
  },
  {
    name: "Melbourne University",
    slug: "melbu",
    type: "University",
    about: "A leading research university with a focus on innovation.",
    settings: {
      allowExternalApplications: true,
      requireApprovalForPosts: false,
    },
  },
];

// =====================
// USERS (All Roles)
// =====================
const USERS = [
  // Al-Siraat College
  {
    name: "System Administrator",
    email: "admin@alsiraat.edu.au",
    role: UserRole.GLOBAL_ADMIN,
    orgSlug: "alsiraat",
  },
  {
    name: "Dr. Ahmed Khan",
    email: "principal@alsiraat.edu.au",
    role: UserRole.SCHOOL_ADMIN,
    orgSlug: "alsiraat",
    about: "Principal of Al-Siraat College with 20+ years in education.",
  },
  {
    name: "Mrs. Sarah Hassan",
    email: "sarah.hassan@alsiraat.edu.au",
    role: UserRole.TASK_MANAGER,
    orgSlug: "alsiraat",
    about: "Head of Academic Affairs, responsible for curriculum development.",
  },
  {
    name: "Mr. Ali Raza",
    email: "ali.raza@alsiraat.edu.au",
    role: UserRole.TASK_ADVERTISER,
    orgSlug: "alsiraat",
    about: "Science Department Coordinator and Physics Teacher.",
  },
  {
    name: "Fatima Zahra",
    email: "fatima.student@gmail.com",
    role: UserRole.APPLICANT,
    about: "Year 12 student interested in tutoring and community work.",
    skills: [
      { id: "1", name: "Mathematics", level: "Expert" },
      { id: "2", name: "Physics", level: "Intermediate" },
    ],
  },
  {
    name: "Omar Khalid",
    email: "omar.student@gmail.com",
    role: UserRole.APPLICANT,
    about: "University student looking for part-time opportunities.",
    skills: [
      { id: "3", name: "Teaching", level: "Beginner" },
      { id: "4", name: "Event Management", level: "Intermediate" },
    ],
  },
  // Melbourne University
  {
    name: "Prof. Jane Wilson",
    email: "jane.wilson@melbu.edu.au",
    role: UserRole.SCHOOL_ADMIN,
    orgSlug: "melbu",
    about: "Dean of Faculty of Science.",
  },
  {
    name: "Dr. Michael Chen",
    email: "m.chen@melbu.edu.au",
    role: UserRole.TASK_ADVERTISER,
    orgSlug: "melbu",
    about: "Senior Lecturer in Computer Science.",
  },
];

// =====================
// TASKS (All Statuses)
// =====================
const TASKS = [
  // PUBLISHED Tasks
  {
    title: "Math Tutor for Year 10",
    description:
      "We need a qualified math tutor to assist Year 10 students with algebra and geometry. Sessions will be held after school hours in the library.\n\nResponsibilities:\n- Prepare lesson materials\n- Conduct 2-hour tutoring sessions\n- Track student progress",
    category: "Tutoring",
    location: "Library Room 102",
    hoursRequired: 10,
    rewardType: "Paid",
    rewardValue: 250,
    eligibility: ["Students", "Community"],
    visibility: TaskVisibility.GLOBAL,
    status: TaskStatus.PUBLISHED,
    orgSlug: "alsiraat",
  },
  {
    title: "Science Fair Coordinator",
    description:
      "Organize and manage the annual Science Fair event. This includes coordinating with teachers, managing student registrations, and setting up the venue.",
    category: "Event Coordination",
    location: "Main Hall",
    hoursRequired: 20,
    rewardType: "Volunteer",
    eligibility: ["Staff", "Parents"],
    visibility: TaskVisibility.INTERNAL,
    status: TaskStatus.PUBLISHED,
    orgSlug: "alsiraat",
  },
  {
    title: "Research Assistant - AI Lab",
    description:
      "Assist with ongoing machine learning research projects. Must have experience with Python and TensorFlow.",
    category: "Research Lab",
    location: "Building 5, Level 3",
    hoursRequired: 15,
    rewardType: "Paid",
    rewardValue: 400,
    eligibility: ["Students"],
    visibility: TaskVisibility.GLOBAL,
    status: TaskStatus.PUBLISHED,
    orgSlug: "melbu",
  },
  // PENDING Tasks (Awaiting Approval)
  {
    title: "Library Cataloging Assistant",
    description:
      "Help organize and catalog new book acquisitions in the school library.",
    category: "Library Services",
    location: "Main Library",
    hoursRequired: 8,
    rewardType: "VIA Points",
    rewardValue: 50,
    eligibility: ["Students"],
    visibility: TaskVisibility.INTERNAL,
    status: TaskStatus.PENDING,
    orgSlug: "alsiraat",
  },
  {
    title: "Sports Day Volunteer",
    description:
      "Assist with setup, coordination, and cleanup for the annual Sports Day event.",
    category: "Sports Coaching",
    location: "Sports Oval",
    hoursRequired: 6,
    rewardType: "Volunteer",
    eligibility: ["Students", "Parents"],
    visibility: TaskVisibility.GLOBAL,
    status: TaskStatus.PENDING,
    orgSlug: "alsiraat",
  },
  // DRAFT Task
  {
    title: "IT Helpdesk Support (DRAFT)",
    description:
      "Provide technical support to staff and students. This is a draft and not yet visible.",
    category: "IT Helpdesk",
    location: "IT Office",
    hoursRequired: 10,
    rewardType: "Paid",
    rewardValue: 200,
    eligibility: ["Staff", "Students"],
    visibility: TaskVisibility.INTERNAL,
    status: TaskStatus.DRAFT,
    orgSlug: "alsiraat",
  },
  // APPROVED (Ready to Publish)
  {
    title: "Campus Tour Guide",
    description:
      "Lead campus tours for prospective students and families during Open Day.",
    category: "Campus Ambassador",
    location: "Main Campus",
    hoursRequired: 4,
    rewardType: "Voucher",
    rewardValue: 50,
    eligibility: ["Students"],
    visibility: TaskVisibility.GLOBAL,
    status: TaskStatus.APPROVED,
    orgSlug: "alsiraat",
  },
  // CLOSED Task
  {
    title: "Exam Supervision Helper",
    description:
      "Assist with exam supervision duties during mid-term exams. This opportunity has now closed.",
    category: "Admin Support",
    location: "Exam Hall",
    hoursRequired: 12,
    rewardType: "Paid",
    rewardValue: 180,
    eligibility: ["Staff"],
    visibility: TaskVisibility.INTERNAL,
    status: TaskStatus.CLOSED,
    orgSlug: "alsiraat",
  },
  // ARCHIVED Task
  {
    title: "Old Event Helper (Archived)",
    description:
      "This was an old event that has been archived and is no longer active.",
    category: "Event Coordination",
    location: "Hall B",
    hoursRequired: 5,
    rewardType: "Volunteer",
    eligibility: ["Students"],
    visibility: TaskVisibility.INTERNAL,
    status: TaskStatus.ARCHIVED,
    orgSlug: "alsiraat",
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("\n🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Task.deleteMany({});
    await Application.deleteMany({});
    console.log("   Data cleared.");

    // Create Organizations
    console.log("\n🏫 Creating organisations...");
    const orgMap: Record<string, any> = {};
    for (const orgData of ORGANIZATIONS) {
      const org = await Organization.create(orgData);
      orgMap[org.slug] = org;
      console.log(`   ✅ ${org.name}`);
    }

    // Create Users
    console.log("\n👥 Creating users...");
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const userMap: Record<string, any> = {};
    for (const userData of USERS) {
      const { orgSlug, ...rest } = userData;
      const user = await User.create({
        ...rest,
        password: hashedPassword,
        organization: orgSlug ? orgMap[orgSlug]?._id : undefined,
        skills: rest.skills || [],
      });
      userMap[user.email] = user;
      console.log(`   ✅ ${user.name} (${user.role})`);
    }

    // Create Tasks
    console.log("\n📋 Creating tasks...");
    const taskMap: Record<string, any> = {};
    for (const taskData of TASKS) {
      const { orgSlug, ...rest } = taskData;
      const org = orgMap[orgSlug];
      const creator = Object.values(userMap).find(
        (u: any) =>
          u.organization?.toString() === org?._id.toString() &&
          u.role !== UserRole.APPLICANT,
      );

      const task = await Task.create({
        ...rest,
        organization: org?._id,
        createdBy: creator?._id,
      });
      taskMap[task.title] = task;
      console.log(`   ✅ ${task.title} [${task.status}]`);
    }

    // Create Sample Applications
    console.log("\n📝 Creating sample applications...");
    const publishedTask = taskMap["Math Tutor for Year 10"];
    const pendingTask = taskMap["Library Cataloging Assistant"];
    const fatima = userMap["fatima.student@gmail.com"];
    const omar = userMap["omar.student@gmail.com"];

    if (publishedTask && fatima) {
      await Application.create({
        task: publishedTask._id,
        applicant: fatima._id,
        coverLetter:
          "I am passionate about mathematics and have been helping my peers with their studies. I would love the opportunity to tutor Year 10 students.",
        availability: "Available Monday to Thursday, 3:30 PM - 5:30 PM",
        status: "Pending",
      });
      console.log("   ✅ Fatima's application for Math Tutor");
    }

    if (publishedTask && omar) {
      await Application.create({
        task: publishedTask._id,
        applicant: omar._id,
        coverLetter:
          "As a university student majoring in education, I believe I can contribute effectively to this tutoring role.",
        availability: "Weekends only",
        status: "Pending",
      });
      console.log("   ✅ Omar's application for Math Tutor");
    }

    if (pendingTask && fatima) {
      await Application.create({
        task: pendingTask._id,
        applicant: fatima._id,
        coverLetter:
          "I love organizing books and have experience helping in my local library.",
        availability: "After school hours",
        status: "Pending",
      });
      console.log("   ✅ Fatima's application for Library Assistant");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DATABASE SEEDING COMPLETE!");
    console.log("=".repeat(50));
    console.log("\n📋 TEST ACCOUNTS (Password: " + DEFAULT_PASSWORD + ")");
    console.log("-".repeat(50));
    console.log("GLOBAL ADMIN:   admin@alsiraat.edu.au");
    console.log("SCHOOL ADMIN:   principal@alsiraat.edu.au");
    console.log("TASK MANAGER:   sarah.hassan@alsiraat.edu.au");
    console.log("TASK ADVERTISER: ali.raza@alsiraat.edu.au");
    console.log("STUDENT 1:      fatima.student@gmail.com");
    console.log("STUDENT 2:      omar.student@gmail.com");
    console.log("-".repeat(50));
    console.log("\n⚠️  Change passwords before deploying to production!\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedDatabase();
