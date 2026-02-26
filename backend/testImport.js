import mongoose from "mongoose";
import fs from "fs";
import csvParser from "csv-parser";
import bcrypt from "bcryptjs";

const UserRole = {
  GLOBAL_ADMIN: "Global Admin",
  SCHOOL_ADMIN: "School Admin",
  TASK_MANAGER: "Task Manager",
  TASK_ADVERTISER: "Task Advertiser",
  APPLICANT: "Applicant",
};

const normalizeUserRole = (v) => {
  if (typeof v !== "string" || !v) return v;

  const normalizedLower = v.toLowerCase().trim();

  const legacyMap = {
    admin: UserRole.GLOBAL_ADMIN,
    owner: UserRole.SCHOOL_ADMIN,
    approver: UserRole.TASK_MANAGER,
    member: UserRole.TASK_ADVERTISER,
    independent: UserRole.APPLICANT,
    teacher: UserRole.TASK_ADVERTISER,
    staff: UserRole.TASK_ADVERTISER,
    administrative: UserRole.SCHOOL_ADMIN,
    guardian: UserRole.APPLICANT,
    assessor: UserRole.TASK_MANAGER,
  };

  if (legacyMap[normalizedLower]) {
    return legacyMap[normalizedLower];
  }

  const role = Object.values(UserRole).find(
    (r) =>
      r.toLowerCase() === normalizedLower ||
      r.toLowerCase() === normalizedLower.replace(/_/g, " "),
  );
  return role || v;
};

// Simplified UserSchema mapped directly
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  roles: [
    {
      type: String,
      enum: Object.values(UserRole),
      set: normalizeUserRole,
    },
  ],
  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  yearLevel: { type: String },
});
const User = mongoose.model("User", UserSchema);

const testImport = async () => {
  // Just run Mongoose validation rules explicitly!
  const results = [];
  fs.createReadStream("uploads/users.csv")
    .pipe(csvParser())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      console.log("Parsed", results.length);
      try {
        const row = results[0]; // test row
        const email = (row.email || "").trim().toLowerCase();
        const firstName = (row.first_name || "").trim();
        const lastName = (row.last_name || "").trim();
        let name = `${firstName} ${lastName}`.trim();
        if (!name) name = row.username || email.split("@")[0] || "Unknown User";

        const rolesStr = row.roles || row.role || "Applicant";
        let rolesArray = rolesStr
          .split(",")
          .map((r) => normalizeUserRole(r.trim()))
          .filter((r) => Object.values(UserRole).includes(r));

        if (rolesArray.length === 0) rolesArray = [UserRole.APPLICANT];

        const password = row.login_id || "Teacher123!"; // Default password strategy
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const mappedGender =
          row.gender?.toUpperCase() === "M"
            ? "Male"
            : row.gender?.toUpperCase() === "F"
              ? "Female"
              : undefined;

        const user = new User({
          name,
          email,
          password: hashedPassword,
          roles: rolesArray,
          ...(mappedGender && { gender: mappedGender }),
          ...(row.year_level && { yearLevel: row.year_level }),
        });

        const err = user.validateSync();
        if (err) {
          console.log("Validation error:", err.message);
          Object.keys(err.errors).forEach((key) => {
            console.log(
              `Failed at field: ${key}, value: ${err.errors[key].value}, message: ${err.errors[key].message}`,
            );
          });
        } else {
          console.log("All looking good!", user.toObject());
        }
      } catch (e) {
        console.error("error!", e);
      }
    });
};
testImport();
