/**
 * One-off migration: remove legacy task status "Archived" from documents.
 * Sets archivedAt from updatedAt (or now), rewrites status to Closed so the
 * Task schema enum no longer includes "Archived".
 *
 * Run after deploying Task model changes:
 *   npm run migrate:task-remove-archived-status --prefix backend
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

  const cursor = col.find({ status: "Archived" });
  let n = 0;
  for await (const doc of cursor) {
    const archivedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt
        : doc.updatedAt
          ? new Date(doc.updatedAt)
          : new Date();
    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          archivedAt,
          status: "Closed",
        },
      },
    );
    n++;
  }

  console.log(
    `migrateTaskRemoveArchivedStatus: migrated ${n} task(s) from status Archived → Closed + archivedAt`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
