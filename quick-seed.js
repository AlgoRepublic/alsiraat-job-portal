// Quick seed script - run with: cd backend && node ../quick-seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/alsiraat";

async function quickSeed() {
  try {
    console.log("🔌 Connecting...");
    await mongoose.connect(MONGODB_URI);

    const RewardType = mongoose.model(
      "RewardType",
      new mongoose.Schema({
        name: String,
        code: String,
        icon: String,
        color: String,
        description: String,
        valueKind: String,
        calculationMode: String,
        requiresValue: Boolean,
        isActive: Boolean,
        isSystem: Boolean,
      }),
    );

    const TaskCategory = mongoose.model(
      "TaskCategory",
      new mongoose.Schema({
        name: String,
        code: String,
        icon: String,
        color: String,
        active: Boolean,
      }),
    );

    console.log("💰 Seeding rewards...");
    await RewardType.deleteMany({});
    /** Keep in sync with backend/src/config/defaultRewardTypes.ts */
    await RewardType.insertMany([
      {
        name: "Hourly Rate",
        code: "hourly",
        color: "#10B981",
        description: "Payment based on hours worked",
        valueKind: "currency",
        calculationMode: "hourly",
        requiresValue: true,
        valuePrefix: "$",
        valueSuffix: "/hr",
        isActive: true,
        isSystem: true,
      },
      {
        name: "Lumpsum",
        code: "lumpsum",
        color: "#3B82F6",
        description: "One-time fixed payment",
        valueKind: "currency",
        calculationMode: "fixed",
        requiresValue: true,
        valuePrefix: "$",
        isActive: true,
        isSystem: true,
      },
      {
        name: "Voucher",
        code: "voucher",
        color: "#8B5CF6",
        description: "Gift voucher or certificate",
        valueKind: "currency",
        calculationMode: "fixed",
        requiresValue: true,
        unitLabel: "Voucher",
        valuePrefix: "$",
        isActive: true,
        isSystem: true,
      },
      {
        name: "VIA Hours",
        code: "via_hours",
        color: "#F59E0B",
        description: "Values in Action service hours",
        valueKind: "number",
        calculationMode: "hours",
        requiresValue: true,
        unitLabel: "Hours",
        isActive: true,
        isSystem: true,
      },
      {
        name: "Community Service Recognition",
        code: "community_service",
        color: "#EF4444",
        description: "Recognition for community service contribution",
        valueKind: "none",
        calculationMode: "none",
        requiresValue: false,
        isActive: true,
        isSystem: true,
      },
    ]);

    console.log("📂 Seeding categories...");
    await TaskCategory.deleteMany({});
    await TaskCategory.insertMany([
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
    ]);

    console.log("✅ Done!\n");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
}

quickSeed();
