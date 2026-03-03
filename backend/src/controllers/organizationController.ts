import { Request, Response } from "express";
import Organization from "../models/Organization.js";
import User, { UserRole } from "../models/User.js";

/**
 * Normalise an organisation name so it is always stored consistently.
 * Rules:
 *   1. Trim leading/trailing whitespace
 *   2. Collapse internal multiple spaces to one
 *   3. Title-case every word (e.g. "al-siraat college" → "Al-Siraat College")
 *
 * This makes `name` safe to compare with a simple case-insensitive regex
 * AND avoids creating duplicate orgs due to trivial formatting differences.
 */
export function normalizeOrgName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build a URL-safe slug from a name.
 */
export function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, domain, logo, about, ownerId } = req.body;

    const owner = await User.findById(ownerId);
    if (!owner)
      return res.status(404).json({ message: "Owner user not found" });

    const normalizedName = normalizeOrgName(name || "");
    const slug = slugifyOrgName(normalizedName);

    const org = await Organization.create({
      name: normalizedName,
      slug,
      domain,
      logo,
      about,
      owner: ownerId,
    });

    // Assign org + School Admin role to owner
    owner.organisation = org._id as any;
    owner.roles = [UserRole.SCHOOL_ADMIN];
    await owner.save();

    res.status(201).json(org);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await Organization.find().sort({ name: 1 });
    res.json(orgs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.organisation) {
      return res
        .status(400)
        .json({ message: "User already belongs to an organization" });
    }

    user.organisation = organization._id as any;
    user.roles = [role || UserRole.TASK_ADVERTISER];

    await user.save();

    res.json({ message: "Member added successfully", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
