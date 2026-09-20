/**
 * One-off spot-check: group kinds migration completeness.
 * Usage: npx tsx backend/src/scripts/verifyGroupKindsMigration.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { verifyGroupKindsInvariants } from "../services/migrateGroupKinds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker-dev";

function dbNameFromUri(uri: string): string {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    const pathname = u.pathname.replace(/^\//, "").split("?")[0];
    return pathname || "(default)";
  } catch {
    return "(unknown)";
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.db!.databaseName;

  const { checks, overallPass } = await verifyGroupKindsInvariants();

  const groups = mongoose.connection.db!.collection("groups");
  const organisations = mongoose.connection.db!.collection("organizations");

  const report = {
    connectedUriDbHint: dbNameFromUri(MONGODB_URI),
    actualDatabase: dbName,
    overall: overallPass ? "PASS" : "FAIL",
    totals: {
      organisations: await organisations.countDocuments(),
      groups: await groups.countDocuments(),
      defaultGroups: await groups.countDocuments({ isDefault: true }),
    },
    checks,
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
  process.exit(overallPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
