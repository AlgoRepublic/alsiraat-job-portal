import { Request, Response } from "express";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { groupDocumentToClientJson } from "../services/hydrateOrganisationRolesPayload.js";
import {
  assertDefaultGroupMemberChangeAllowed,
  assertDefaultGroupNotDeletable,
  assertDefaultGroupUpdateAllowed,
  assertCustomGroupNameAllowed,
  assertGroupKindRequiredForCreate,
  assertOidcMappingAllowedForGroup,
  assertUsersMatchGroupKind,
  GroupKindError,
  normalizeGroupKind,
  sanitizeOidcMappingForGroupKind,
} from "../services/groupKindMembership.js";
import { assertUsersHaveTaskApproveInOrg } from "../services/groupApprovalMembers.js";

const MEMBER_USER_FIELDS =
  "name email avatar role roles organisationRoles isSuperAdmin";
const MEMBER_USER_FIELDS_WITH_ORG =
  "name email avatar role roles organisation organisationRoles isSuperAdmin";

async function populateGroupUsers(group: {
  populate: (path: string, select: string) => Promise<unknown>;
}) {
  await group.populate("members", MEMBER_USER_FIELDS);
  await group.populate("approvalMembers", MEMBER_USER_FIELDS);
}

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
      .populate("members", MEMBER_USER_FIELDS)
      .populate("approvalMembers", MEMBER_USER_FIELDS)
      .populate("createdBy", "name email")
      .populate("organisation", "name")
      .sort({ createdAt: -1 });

    res.json(
      await Promise.all(groups.map((g) => groupDocumentToClientJson(g))),
    );
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
      .select("name description color members kind isDefault")
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
      .populate("members", MEMBER_USER_FIELDS_WITH_ORG)
      .populate("approvalMembers", MEMBER_USER_FIELDS_WITH_ORG)
      .populate("createdBy", "name email")
      .populate("organisation", "name");

    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(await groupDocumentToClientJson(group));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/groups - create group
export const createGroup = async (req: any, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { name, description, color, members, approvalMembers, oidcMapping, kind } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    try {
      assertCustomGroupNameAllowed(name);
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    let groupKind;
    try {
      groupKind = assertGroupKindRequiredForCreate(kind);
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    const normalizedOidc = sanitizeOidcMappingForGroupKind(
      groupKind,
      oidcMapping,
    );

    // Validate members exist
    if (members && members.length > 0) {
      const foundUsers = await User.find({ _id: { $in: members } });
      if (foundUsers.length !== members.length) {
        return res
          .status(400)
          .json({ message: "One or more member users not found" });
      }
      try {
        assertUsersMatchGroupKind(foundUsers, orgId, groupKind);
      } catch (e) {
        if (e instanceof GroupKindError) {
          return res.status(e.status).json({ message: e.message });
        }
        throw e;
      }
    }

    const approvalMemberIds = Array.isArray(approvalMembers)
      ? approvalMembers
      : [];
    if (approvalMemberIds.length > 0) {
      const foundApprovers = await User.find({ _id: { $in: approvalMemberIds } });
      if (foundApprovers.length !== approvalMemberIds.length) {
        return res
          .status(400)
          .json({ message: "One or more approval member users not found" });
      }
      try {
        await assertUsersHaveTaskApproveInOrg(foundApprovers, orgId);
      } catch (e) {
        if (e instanceof GroupKindError) {
          return res.status(e.status).json({ message: e.message });
        }
        throw e;
      }
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#6B7280",
      members: members || [],
      approvalMembers: approvalMemberIds,
      oidcMapping: normalizedOidc,
      kind: groupKind,
      isDefault: false,
      organisation: orgId,
      createdBy: req.user._id,
    });

    await group.save();
    await populateGroupUsers(group);

    res.status(201).json(await groupDocumentToClientJson(group));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/groups/:id - update group
export const updateGroup = async (req: any, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { name, description, color, isActive, oidcMapping, approvalMembers } =
      req.body;

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));
    const group = await Group.findOne({
      _id: groupId,
      organisation: orgId,
    });
    if (!group) return res.status(404).json({ message: "Group not found" });

    try {
      assertDefaultGroupUpdateAllowed(group, { name, isActive });
      if (Array.isArray(oidcMapping)) {
        assertOidcMappingAllowedForGroup(group, oidcMapping);
      }
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    const groupKind = normalizeGroupKind(group.kind);

    if (name !== undefined) {
      try {
        assertCustomGroupNameAllowed(name, { isDefault: group.isDefault });
      } catch (e) {
        if (e instanceof GroupKindError) {
          return res.status(e.status).json({ message: e.message });
        }
        throw e;
      }
      group.name = name.trim();
    }
    if (description !== undefined) group.description = description.trim();
    if (color !== undefined) group.color = color;
    if (isActive !== undefined) group.isActive = isActive;
    if (Array.isArray(oidcMapping)) {
      group.oidcMapping = sanitizeOidcMappingForGroupKind(
        groupKind,
        oidcMapping,
      );
    }

    if (Array.isArray(approvalMembers)) {
      const approvalMemberIds = approvalMembers;
      if (approvalMemberIds.length > 0) {
        const foundApprovers = await User.find({
          _id: { $in: approvalMemberIds },
        });
        if (foundApprovers.length !== approvalMemberIds.length) {
          return res
            .status(400)
            .json({ message: "One or more approval member users not found" });
        }
        try {
          await assertUsersHaveTaskApproveInOrg(foundApprovers, orgId);
        } catch (e) {
          if (e instanceof GroupKindError) {
            return res.status(e.status).json({ message: e.message });
          }
          throw e;
        }
      }
      group.approvalMembers = approvalMemberIds;
    }

    await group.save();
    await populateGroupUsers(group);

    res.json(await groupDocumentToClientJson(group));
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

    try {
      assertDefaultGroupNotDeletable(group);
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

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

    try {
      assertUsersMatchGroupKind(
        foundUsers,
        orgId,
        normalizeGroupKind(group.kind),
      );
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    // Add only new members (avoid duplicates)
    const existingIds = group.members.map((m) => m.toString());
    const newIds = userIds.filter((id: string) => !existingIds.includes(id));
    group.members.push(...newIds);

    await group.save();
    await populateGroupUsers(group);

    res.json(await groupDocumentToClientJson(group));
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

    try {
      assertDefaultGroupMemberChangeAllowed(group);
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    group.members = group.members.filter((m) => m.toString() !== userId) as any;
    await group.save();
    await populateGroupUsers(group);

    res.json(await groupDocumentToClientJson(group));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/groups/:id/approval-members - add approval members to group
export const addApprovalMembers = async (req: Request, res: Response) => {
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

    const foundUsers = await User.find({ _id: { $in: userIds } });
    if (foundUsers.length !== userIds.length) {
      return res.status(400).json({ message: "One or more users not found" });
    }

    try {
      await assertUsersHaveTaskApproveInOrg(foundUsers, orgId);
    } catch (e) {
      if (e instanceof GroupKindError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    const existingIds = (group.approvalMembers ?? []).map((m) => m.toString());
    const newIds = userIds.filter((id: string) => !existingIds.includes(id));
    group.approvalMembers.push(...newIds);

    await group.save();
    await populateGroupUsers(group);

    res.json(await groupDocumentToClientJson(group));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/groups/:id/approval-members/:userId - remove approval member
export const removeApprovalMember = async (req: Request, res: Response) => {
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

    group.approvalMembers = (group.approvalMembers ?? []).filter(
      (m) => m.toString() !== userId,
    ) as any;
    await group.save();
    await populateGroupUsers(group);

    res.json(await groupDocumentToClientJson(group));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
