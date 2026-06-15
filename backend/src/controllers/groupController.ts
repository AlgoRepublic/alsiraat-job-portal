import { Request, Response } from "express";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import User from "../models/User.js";

function requireOrgId(req: any, res: Response): string | null {
  const orgId = req.orgId?.toString?.() ?? null;
  if (!orgId) {
    res.status(400).json({
      message: "Select an organisation to view and manage groups",
    });
    return null;
  }
  return orgId;
}

// GET /api/groups - list all groups
export const getGroups = async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req as any, res);
    if (!orgId) return;

    const { search } = req.query;
    let query: any = { organisation: orgId };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const groups = await Group.find(query)
      .populate("members", "name email avatar role roles organisationRoles isSuperAdmin")
      .populate("createdBy", "name email")
      .populate("organisation", "name")
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/groups/public - lightweight list for dropdowns (no auth restrictions)
export const getGroupsPublic = async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req as any, res);
    if (!orgId) return;

    const groups = await Group.find({ isActive: true, organisation: orgId })
      .select("name description color members")
      .sort({ name: 1 });

    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/groups/:id - get single group
export const getGroup = async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req as any, res);
    if (!orgId) return;

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));
    const group = await Group.findOne({
      _id: groupId,
      organisation: orgId,
    })
      .populate(
        "members",
        "name email avatar role roles organisation organisationRoles isSuperAdmin",
      )
      .populate("createdBy", "name email")
      .populate("organisation", "name");

    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/groups - create group
export const createGroup = async (req: any, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { name, description, color, members, oidcMapping } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Validate members exist
    if (members && members.length > 0) {
      const foundUsers = await User.find({ _id: { $in: members } });
      if (foundUsers.length !== members.length) {
        return res
          .status(400)
          .json({ message: "One or more member users not found" });
      }
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#6B7280",
      members: members || [],
      oidcMapping: Array.isArray(oidcMapping) ? oidcMapping.map((v: string) => String(v).trim()).filter(Boolean) : [],
      organisation: orgId,
      createdBy: req.user._id,
    });

    await group.save();
    await group.populate(
      "members",
      "name email avatar role roles organisationRoles isSuperAdmin",
    );

    res.status(201).json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/groups/:id - update group
export const updateGroup = async (req: any, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { name, description, color, isActive, oidcMapping } = req.body;

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));
    const group = await Group.findOne({
      _id: groupId,
      organisation: orgId,
    });
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (color !== undefined) group.color = color;
    if (isActive !== undefined) group.isActive = isActive;
    if (Array.isArray(oidcMapping)) {
      group.oidcMapping = oidcMapping.map((v: string) => String(v).trim()).filter(Boolean);
    }

    await group.save();
    await group.populate(
      "members",
      "name email avatar role roles organisationRoles isSuperAdmin",
    );

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/groups/:id - delete group
export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req as any, res);
    if (!orgId) return;

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));
    const group = await Group.findOne({
      _id: groupId,
      organisation: orgId,
    });
    if (!group) return res.status(404).json({ message: "Group not found" });

    await group.deleteOne();
    res.json({ message: "Group deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/groups/:id/members - add members to group
export const addMembers = async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req as any, res);
    if (!orgId) return;

    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));
    const group = await Group.findOne({
      _id: groupId,
      organisation: orgId,
    });
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Validate users exist
    const foundUsers = await User.find({ _id: { $in: userIds } });
    if (foundUsers.length !== userIds.length) {
      return res.status(400).json({ message: "One or more users not found" });
    }

    // Add only new members (avoid duplicates)
    const existingIds = group.members.map((m) => m.toString());
    const newIds = userIds.filter((id: string) => !existingIds.includes(id));
    group.members.push(...newIds);

    await group.save();
    await group.populate(
      "members",
      "name email avatar role roles organisationRoles isSuperAdmin",
    );

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/groups/:id/members/:userId - remove member from group
export const removeMember = async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req as any, res);
    if (!orgId) return;

    const { userId } = req.params;

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));
    const group = await Group.findOne({
      _id: groupId,
      organisation: orgId,
    });
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter((m) => m.toString() !== userId) as any;
    await group.save();
    await group.populate(
      "members",
      "name email avatar role roles organisationRoles isSuperAdmin",
    );

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
