import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import csvParser from "csv-parser";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";
import { UserRole, normalizeUserRole } from "./src/models/UserRole.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "./.env" });
console.log("Starting test import...");

const testImport = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB.");

    const results: any[] = [];
    const csvPath = path.join(__dirname, "uploads", "users.csv");

    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        console.log(`Parsed ${results.length} rows.`);
        let numParsed = 0;

        for (const row of results.slice(0, 10)) {
          // just test first 10
          try {
            const email = (row.email || "").trim().toLowerCase();
            const firstName = (row.first_name || "").trim();
            const lastName = (row.last_name || "").trim();
            let name = `${firstName} ${lastName}`.trim();
            if (!name)
              name = row.username || email.split("@")[0] || "Unknown User";

            const rolesStr = row.roles || row.role || "Applicant";
            let rolesArray = rolesStr
              .split(",")
              .map((r: string) => normalizeUserRole(r.trim()))
              .filter((r: string) =>
                Object.values(UserRole).includes(r as UserRole),
              );

            if (rolesArray.length === 0) {
              rolesArray = [UserRole.APPLICANT];
            }

            let user = await User.findOne({ email });
            if (!user) {
              const password = row.login_id || "Teacher123!";
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(password, salt);

              const mappedGender =
                row.gender?.toUpperCase() === "M"
                  ? "Male"
                  : row.gender?.toUpperCase() === "F"
                    ? "Female"
                    : undefined;

              user = new User({
                name,
                email,
                password: hashedPassword,
                roles: rolesArray,
                ...(mappedGender && { gender: mappedGender }),
                ...(row.year_level && { yearLevel: row.year_level }),
              });

              const validationError = user.validateSync();
              if (validationError) {
                console.error(
                  "Validation error for row:",
                  row,
                  validationError.message,
                );
              } else {
                console.log(`Would successfully save user: ${email}`);
              }
            } else {
              console.log(`Skipping duplicate user: ${email}`);
            }
          } catch (e: any) {
            console.error("Error importing row:", row, e.message || e);
          }
        }
        process.exit();
      });
  } catch (err: any) {
    console.error("Setup error:", err.message);
    process.exit(1);
  }
};

testImport();
