import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Import models
import User from "../models/User.js";
import Organization from "../models/Organization.js";

const MONGODB_URI = "mongodb://localhost:27017/tasker";

async function checkUserOrganizations() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all users with organizations populated
    const users = await User.find()
      .populate("organisations")
      .select("name email role organisations");

    console.log("📊 User Organization Status:\n");
    console.log("Total users:", users.length);
    console.log("\nUser Details:");

    for (const user of users) {
      console.log(`\n- ${user.name} (${user.email})`);
      const roleList = (user.organisationRoles || [])
        .flatMap((entry: any) => entry.roles || [])
        .join(", ");
      console.log(`  Roles: ${roleList || "None"}`);
      console.log(`  organisations:`, (user as any).organisations);
    }

    console.log("\n\n🏢 Organizations in database:");
    const orgs = await Organization.find();
    for (const org of orgs) {
      console.log(`- ${org.name} (${org._id})`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

checkUserOrganizations();
