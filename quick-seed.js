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
        requiresValue: Boolean,
        active: Boolean,
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
    await RewardType.insertMany([
      {
        name: "Hourly Rate",
        code: "hourly",
        icon: "💵",
        color: "#10B981",
        requiresValue: true,
        active: true,
      },
      {
        name: "Lumpsum",
        code: "lumpsum",
        icon: "💰",
        color: "#F59E0B",
        requiresValue: true,
        active: true,
      },
      {
        name: "Voucher",
        code: "voucher",
        icon: "🎟️",
        color: "#8B5CF6",
        requiresValue: true,
        active: true,
      },
      {
        name: "VIA Hours",
        code: "via_hours",
        icon: "⏱️",
        color: "#3B82F6",
        requiresValue: false,
        active: true,
      },
      {
        name: "Community Service Recognition",
        code: "community_service",
        icon: "🏆",
        color: "#EF4444",
        requiresValue: false,
        active: true,
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
