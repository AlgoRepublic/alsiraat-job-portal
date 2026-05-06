/**
 * One-off script: for each Task, read `eligibility` array and, when a Group
 * with the same name exists in the Task's organisation, append that Group's
 * ObjectId to `allowedGroups` (if not already present).
 *
 * Run with:
 *   npm run sync:task-groups --prefix backend
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const uri =
    process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tasker";

  await mongoose.connect(uri);
  const { default: Task } = await import("../models/Task.js");
  const { default: Group } = await import("../models/Group.js");

  const cursor = Task.find({ eligibility: { $exists: true, $ne: [] } }).cursor();

  let tasksProcessed = 0;
  let groupsLinked = 0;
  let groupsNotFound = 0;

  for (let task = await cursor.next(); task != null; task = await cursor.next()) {
    tasksProcessed += 1;

    if (!task.organisation) continue;

    const eligibilities: string[] = Array.isArray(task.eligibility) ? task.eligibility : [];

    for (const name of eligibilities) {
      if (!name || typeof name !== "string") continue;

      const group = await Group.findOne({ name: name.trim(), organisation: task.organisation });
      if (!group) {
        groupsNotFound += 1;
        continue;
      }

      const res = await Task.updateOne(
        { _id: task._id },
        { $addToSet: { allowedGroups: group._id } },
      );

      if (res.modifiedCount && res.modifiedCount > 0) groupsLinked += 1;
    }
  }

  console.log(`syncTaskGroupsFromEligibility: tasksProcessed=${tasksProcessed}, groupsLinked=${groupsLinked}, groupsNotFound=${groupsNotFound}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
