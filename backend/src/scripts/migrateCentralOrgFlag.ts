/**
 * One-time: mark the platform Central organisation with isCentralOrg and
 * backfill users who completed signup without org membership.
 *
 * Run with:
 *   npx tsx src/scripts/migrateCentralOrgFlag.ts <organisationId or slug>
 *
 * Example (production):
 *   npx tsx src/scripts/migrateCentralOrgFlag.ts tasker-central
 *
 * Skip user backfill:
 *   npx tsx src/scripts/migrateCentralOrgFlag.ts tasker-central --no-backfill
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import {
  assignCentralOrganisationMembership,
  setCentralOrganisationFlag,
} from "../utils/centralOrg.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function backfillUsersWithoutCentralMembership(
  centralOrgId: mongoose.Types.ObjectId,
) {
  const centralOrgIdStr = centralOrgId.toString();
  const candidates = await User.find({
    password: { $exists: true, $ne: null },
    $or: [
      { organisations: { $exists: false } },
      { organisations: { $size: 0 } },
    ],
  }).select("_id email name organisations organisationRoles");

  let updated = 0;
  let skipped = 0;

  for (const user of candidates) {
    const hasCentral = (user.organisations ?? []).some(
      (orgId) => orgId.toString() === centralOrgIdStr,
    );
    const hasCentralRole = (user.organisationRoles ?? []).some(
      (entry) => entry.organisation?.toString() === centralOrgIdStr,
    );
    if (hasCentral && hasCentralRole) {
      skipped++;
      continue;
    }

    const applied = await assignCentralOrganisationMembership(user);
    if (!applied) {
      console.warn(`  Skipped ${user.email}: Central org not resolvable`);
      skipped++;
      continue;
    }
    await user.save();
    updated++;
    console.log(`  Backfilled: ${user.email}`);
  }

  console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--no-backfill");
  const backfill = !process.argv.includes("--no-backfill");
  const target = args[0]?.trim();

  if (!target) {
    console.error(
      "Usage: npx tsx src/scripts/migrateCentralOrgFlag.ts <organisationId or slug> [--no-backfill]",
    );
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const query = mongoose.isValidObjectId(target)
    ? { _id: new mongoose.Types.ObjectId(target) }
    : { slug: target.toLowerCase() };

  const org = await Organization.findOne(query).select(
    "_id name slug isCentralOrg",
  );
  if (!org) {
    console.error(`Organisation not found for: ${target}`);
    process.exit(1);
  }

  await setCentralOrganisationFlag(org._id as mongoose.Types.ObjectId, true);

  const refreshed = await Organization.findById(org._id).lean();
  console.log(
    `Set isCentralOrg on "${refreshed?.name}" (slug: ${refreshed?.slug}, id: ${refreshed?._id})`,
  );

  if (backfill) {
    console.log("\nBackfilling users missing Central membership...");
    await backfillUsersWithoutCentralMembership(
      org._id as mongoose.Types.ObjectId,
    );
  } else {
    console.log("\nSkipped user backfill (--no-backfill)");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
