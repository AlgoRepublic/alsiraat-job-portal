import mongoose from "mongoose";
import RewardType from "./backend/src/models/RewardType.js";
import TaskCategory from "./backend/src/models/TaskCategory.js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/alsiraat";

const rewardTypes = [
  {
    name: "Hourly Rate",
    code: "hourly",
    icon: "💵",
    color: "#10B981",
    description: "Payment per hour",
    valueKind: "currency",
    calculationMode: "hourly",
    requiresValue: true,
    isActive: true,
    isSystem: true,
  },
  {
    name: "Lumpsum",
    code: "lumpsum",
    icon: "💰",
    color: "#F59E0B",
    description: "One-time fixed payment",
    valueKind: "currency",
    calculationMode: "fixed",
    requiresValue: true,
    isActive: true,
    isSystem: true,
  },
  {
    name: "Voucher",
    code: "voucher",
    icon: "🎟️",
    color: "#8B5CF6",
    description: "Gift voucher",
    valueKind: "currency",
    calculationMode: "fixed",
    requiresValue: true,
    isActive: true,
    isSystem: true,
  },
  {
    name: "VIA Hours",
    code: "via_hours",
    icon: "⏱️",
    color: "#3B82F6",
    description: "Values in Action hours",
    valueKind: "number",
    calculationMode: "hours",
    requiresValue: true,
    isActive: true,
    isSystem: true,
  },
  {
    name: "Community Service Recognition",
    code: "community_service",
    icon: "🏆",
    color: "#EF4444",
    description: "Recognition for community service contribution",
    valueKind: "none",
    calculationMode: "none",
    requiresValue: false,
    isActive: true,
    isSystem: true,
  },
];

const categories = [
  {
    name: "Events",
    code: "events",
    icon: "🎉",
    color: "#FF6B6B",
    active: true,
  },
  {
    name: "Programs",
    code: "programs",
    icon: "📊",
    color: "#4ECDC4",
    active: true,
  },
  {
    name: "Seminar",
    code: "seminar",
    icon: "🎓",
    color: "#45B7D1",
    active: true,
  },
  {
    name: "Maintenance",
    code: "maintenance",
    icon: "🔧",
    color: "#FFA07A",
    active: true,
  },
  {
    name: "Tutoring",
    code: "tutoring",
    icon: "📚",
    color: "#98D8C8",
    active: true,
  },
  {
    name: "Cleaning",
    code: "cleaning",
    icon: "🧹",
    color: "#F7DC6F",
    active: true,
  },
  {
    name: "Administration",
    code: "administration",
    icon: "📁",
    color: "#BB8FCE",
    active: true,
  },
  {
    name: "Technology",
    code: "technology",
    icon: "💻",
    color: "#5DADE2",
    active: true,
  },
  {
    name: "Education",
    code: "education",
    icon: "🎒",
    color: "#85C1E2",
    active: true,
  },
  {
    name: "Creative",
    code: "creative",
    icon: "🎨",
    color: "#F8B4D9",
    active: true,
  },
];

async function seed() {
  try {
    console.log(
      "\n════════════════════════════════════════════════════════════",
    );
    console.log("🌱 DIRECT DATABASE SEEDER");
    console.log(
      "════════════════════════════════════════════════════════════\n",
    );

    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Seed Reward Types
    console.log("💰 Seeding Reward Types...");
    await RewardType.deleteMany({}); // Clear existing
    const createdRewardTypes = await RewardType.insertMany(rewardTypes);
    console.log(`✅ Created ${createdRewardTypes.length} reward types\n`);

    // Seed Task Categories
    console.log("📂 Seeding Task Categories...");
    await TaskCategory.deleteMany({}); // Clear existing
    const createdCategories = await TaskCategory.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} task categories\n`);

    console.log("════════════════════════════════════════════════════════════");
    console.log("🎉 SEEDING COMPLETE!");
    console.log(
      "════════════════════════════════════════════════════════════\n",
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
