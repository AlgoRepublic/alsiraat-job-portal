import { Request, Response } from "express";
import User from "../models/User.js";
import Role from "../models/Role.js";
import fs from "fs";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import { UserRole, normalizeUserRole } from "../models/UserRole.js";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.roles = role;
    }

    const users = await User.find(query)
      .populate("organisation", "name")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("organisation", "name")
      .select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { roles } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (roles) {
      user.roles = roles;
      await user.save();
    }

    res.json({ message: "User roles updated successfully", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, email, roles } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent editing self via this admin endpoint
    if (user._id.toString() === (req as any).user._id.toString()) {
      return res.status(400).json({
        message: "Use your profile settings to edit your own account",
      });
    }

    // Check for email uniqueness if changing email
    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing)
        return res.status(400).json({ message: "Email already in use" });
      user.email = email;
    }

    if (name) user.name = name;
    if (roles) user.roles = roles;

    await user.save();
    const updated = await User.findById(user._id)
      .populate("organisation", "name")
      .select("-password");

    res.json({ message: "User updated successfully", user: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent deleting self
    if (user._id.toString() === (req as any).user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const importUsers = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file uploaded" });
    }

    let rawContent = fs.readFileSync(req.file.path, "utf8");
    // Remove BOM if present
    if (rawContent.charCodeAt(0) === 0xfeff) {
      rawContent = rawContent.slice(1);
    }

    const { data: rawRows, errors: parseErrors } = Papa.parse(rawContent, {
      header: false,
      skipEmptyLines: true,
    });

    if (parseErrors.length > 0 && rawRows.length === 0) {
      console.error("PapaParse errors:", parseErrors);
      return res.status(400).json({ message: "Failed to parse CSV format" });
    }

    // Find the header row (the first row containing 'email')
    let headerRowIndex = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i] as string[];
      if (row.some((cell: string) => cell.toLowerCase().trim() === "email")) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return res
        .status(400)
        .json({ message: "Could not find 'email' column header in CSV." });
    }

    const headers = (rawRows[headerRowIndex] as string[]).map((h) =>
      h.trim().toLowerCase(),
    );
    const results: any[] = [];
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const rowArr = rawRows[i] as string[];
      if (rowArr.length === 0 || (rowArr.length === 1 && !rowArr[0])) continue;

      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = rowArr[index];
      });
      results.push(obj);
    }

    let imported = 0;
    let errors = 0;

    console.log("Total valid rows parsed from CSV:", results.length);
    if (results.length > 0) {
      console.log("Sample row data:", results[0]);
    }

    for (const row of results) {
      try {
        const email = (row.email || "").trim().toLowerCase();
        const firstName = (row.first_name || "").trim();
        const lastName = (row.last_name || "").trim();
        let name = `${firstName} ${lastName}`.trim();
        if (!name) name = row.username || email.split("@")[0] || "Unknown User";

        if (!email) {
          errors++;
          continue;
        }

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
          const password = row.login_id || "Teacher123!"; // Default password strategy
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
          await user.save();
          imported++;
        } else {
          // Update existing user roles if you want, or just skip
          // user.roles = [...new Set([...user.roles, ...rolesArray])];
          // await user.save();
          console.log(`Skipping duplicate user: ${email}`);
          errors++; // Consider it skipped for now
        }
      } catch (e: any) {
        console.error("Error importing row:", row, e.message || e);
        errors++;
      }
    }

    // Remove file after processing
    fs.unlink(req.file!.path, (err) => {
      if (err) console.error("Error deleting temp csv file:", err);
    });

    res.json({
      message: `Import complete. Added ${imported}, Skipped/Errors: ${errors}`,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
