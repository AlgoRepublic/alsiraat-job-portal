// Simple seed script - Run with: node seed-simple.js
import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb://developer:SBguApHCltSCdmCU366qFKufU9eSRgnK1P9EqkZ7TmY7VxO7@12a49dbc-efe5-41c8-970e-db04e6b737b6.northamerica-northeast2.firestore.goog:443/tasker?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false";

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    // Define schemas
    const RewardTypeSchema = new mongoose.Schema({
      name: String,
      code: String,
      icon: String,
      color: String,
      requiresValue: Boolean,
      active: Boolean,
    });

    const TaskCategorySchema = new mongoose.Schema({
      name: String,
      code: String,
      icon: String,
      color: String,
      active: Boolean,
    });

    const RewardType = mongoose.model("RewardType", RewardTypeSchema);
    const TaskCategory = mongoose.model("TaskCategory", TaskCategorySchema);

    // Clear and seed reward types
    console.log("💰 Seeding Reward Types...");
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
    console.log("✅ Created 5 reward types\n");

    // Clear and seed task categories
    console.log("📂 Seeding Task Categories...");
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
    console.log("✅ Created 10 task categories\n");

    console.log("🎉 Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

seed();
