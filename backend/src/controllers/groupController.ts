import { Request, Response } from "express";
import Group from "../models/Group.js";
import User from "../models/User.js";

// GET /api/groups - list all groups
export const getGroups = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query: any = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const groups = await Group.find(query)
      .populate("members", "name email avatar role")
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
    const groups = await Group.find({ isActive: true })
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
    const group = await Group.findById(req.params.id)
      .populate("members", "name email avatar role organisation")
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
    const { name, description, color, members } = req.body;

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
      organisation: req.user.organisation,
      createdBy: req.user._id,
    });

    await group.save();
    await group.populate("members", "name email avatar role");

    res.status(201).json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/groups/:id - update group
export const updateGroup = async (req: any, res: Response) => {
  try {
    const { name, description, color, isActive } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (color !== undefined) group.color = color;
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();
    await group.populate("members", "name email avatar role");

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/groups/:id - delete group
export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const group = await Group.findById(req.params.id);
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
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    const group = await Group.findById(req.params.id);
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
    await group.populate("members", "name email avatar role");

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/groups/:id/members/:userId - remove member from group
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter((m) => m.toString() !== userId) as any;
    await group.save();
    await group.populate("members", "name email avatar role");

    res.json(group);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
