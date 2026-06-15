/**
 * One-off migration: rename task application window fields.
 *   startDate  → applicationOpenDate
 *   endDate    → applicationCloseDate
 *
 * Safe to re-run: only copies when the new field is missing and the legacy field exists.
 *
 * Run after deploying Task model changes:
 *   npm run migrate:task-application-dates --prefix backend
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/tasker";

  await mongoose.connect(uri);
  const col = mongoose.connection.collection("tasks");

  const openResult = await col.updateMany(
    {
      startDate: { $exists: true, $ne: null },
      $or: [
        { applicationOpenDate: { $exists: false } },
        { applicationOpenDate: null },
      ],
    },
    [{ $set: { applicationOpenDate: "$startDate" } }],
  );

  const closeResult = await col.updateMany(
    {
      endDate: { $exists: true, $ne: null },
      $or: [
        { applicationCloseDate: { $exists: false } },
        { applicationCloseDate: null },
      ],
    },
    [{ $set: { applicationCloseDate: "$endDate" } }],
  );

  const unsetResult = await col.updateMany(
    {
      $or: [
        { startDate: { $exists: true } },
        { endDate: { $exists: true } },
      ],
    },
    { $unset: { startDate: "", endDate: "" } },
  );

  console.log(
    `migrateTaskApplicationDates: copied applicationOpenDate on ${openResult.modifiedCount} task(s), ` +
      `applicationCloseDate on ${closeResult.modifiedCount} task(s), ` +
      `removed legacy fields on ${unsetResult.modifiedCount} task(s)`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
