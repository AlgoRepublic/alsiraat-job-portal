import { Request, Response } from "express";
import Organization from "../models/Organization.js";
import User, { UserRole } from "../models/User.js";

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, domain, logo, about, ownerId } = req.body;

    const owner = await User.findById(ownerId);
    if (!owner)
      return res.status(404).json({ message: "Owner user not found" });

    const org = await Organization.create({
      name,
      domain,
      logo,
      about,
      owner: ownerId,
    });

    // Update owner's role and organization
    // Assign owner role to user
    owner.organisation = org._id as any;
    owner.role = UserRole.SCHOOL_ADMIN;
    await owner.save();

    res.status(201).json(org);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await Organization.find();
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
    user.role = role || UserRole.TASK_ADVERTISER;

    await user.save();

    res.json({ message: "Member added successfully", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
