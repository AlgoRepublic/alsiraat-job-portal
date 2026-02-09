import mongoose from "mongoose";
import dotenv from "dotenv";
// @ts-ignore
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI =
  // process.env.MONGODB_URI ||
  // "mongodb://tasker:WdE0urFVi93pYYOLOzUGn7AGgvfFhe2adPaSj49kbqgG_3IG@1023b557-eaa1-419e-bd02-4df4d15f4409.africa-south1.firestore.goog:443/alsiraat-tasker?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false";  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const mapping = {
      admin: "Global Admin",
      owner: "School Admin",
      approver: "Task Manager",
      member: "Task Advertiser",
      independent: "Applicant",
    };

    console.log("🔄 Starting migration...");

    for (const [oldRole, newRole] of Object.entries(mapping)) {
      // Use regex for case-insensitive matching of old role
      const result = await User.updateMany(
        { role: { $regex: new RegExp(`^${oldRole}$`, "i") } },
        { role: newRole },
      );

      if (result.matchedCount > 0) {
        console.log(
          `   ✨ Updated ${result.modifiedCount} users from '${oldRole}' to '${newRole}'`,
        );
      }
    }

    console.log("✅ Migration complete");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
