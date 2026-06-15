/**
 * One-time: mark the Al Siraat tenant organisation with isAlSiraatOrg.
 *
 * Run with:
 *   npx tsx src/scripts/migrateAlSiraatOrgFlag.ts <organisationId or slug>
 *
 * Example (production):
 *   npx tsx src/scripts/migrateAlSiraatOrgFlag.ts al-siraat-tasker
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Organization from "../models/Organization.js";
import { setAlSiraatOrganisationFlag } from "../utils/alSiraatOrg.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function main() {
  const target = process.argv[2]?.trim();
  if (!target) {
    console.error("Usage: npx tsx src/scripts/migrateAlSiraatOrgFlag.ts <organisationId or slug>");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const query = mongoose.isValidObjectId(target)
    ? { _id: new mongoose.Types.ObjectId(target) }
    : { slug: target.toLowerCase() };

  const org = await Organization.findOne(query).select("_id name slug isAlSiraatOrg");
  if (!org) {
    console.error(`Organisation not found for: ${target}`);
    process.exit(1);
  }

  await setAlSiraatOrganisationFlag(org._id as mongoose.Types.ObjectId, true);

  const refreshed = await Organization.findById(org._id).lean();
  console.log(
    `Set isAlSiraatOrg on "${refreshed?.name}" (slug: ${refreshed?.slug}, id: ${refreshed?._id})`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
