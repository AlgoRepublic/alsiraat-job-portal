import { Request, Response } from "express";
import Organization from "../models/Organization";
import User, { UserRole } from "../models/User";

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
    owner.role = UserRole.OWNER;
    owner.organization = org._id as any;
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
    const { orgId } = req.params;
    const { userId, role } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.organization = orgId as any;
    user.role = role || UserRole.MEMBER;
    await user.save();

    res.json({ message: "Member added successfully", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
