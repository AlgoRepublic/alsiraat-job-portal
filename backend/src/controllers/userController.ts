import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { normalizeOrgMemberKind } from "../models/User.js";
import Organization from "../models/Organization.js";
import Group from "../models/Group.js";
import Role from "../models/Role.js";
import fs from "fs";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import { UserRole, normalizeUserRole } from "../models/UserRole.js";
import { isSuperAdminUser } from "../utils/superAdmin.js";
import Task from "../models/Task.js";
import Application from "../models/Application.js";
import {
  parseTaskLifecycle,
  andWithLifecycle,
  assertTaskLifecycleAccess,
} from "../utils/taskLifecycleQuery.js";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    const { search, role } = req.query;

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;

    let query: any = {};

    const orgId = (req as any).orgId as string | null | undefined;
    // User directory is organisation-scoped when an active org is selected.
    // Super admins without org context can search platform-wide (e.g. organisation onboarding / mark-active).
    if (orgId) {
      query.organisations = orgId;
      if (role) {
        query.organisationRoles = {
          $elemMatch: {
            organisation: new mongoose.Types.ObjectId(String(orgId)),
            roles: role,
          },
        };
      }
    } else if (!isSuperAdminUser(caller)) {
      // Non-super with no active org → can only see themselves
      query._id = caller?._id;
      if (role) {
        query.organisationRoles = {
          $elemMatch: { roles: role },
        };
      }
    } else if (role) {
      query.organisationRoles = {
        $elemMatch: { roles: role },
      };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("organisations", "name logo")
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("organisations", "name logo")
      .select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    const orgId = (req as any).orgId as string | null | undefined;
    if (orgId) {
      const inOrg = (user.organisations ?? []).some(
        (o: any) => o.toString() === orgId.toString(),
      );
      if (!inOrg) return res.status(404).json({ message: "User not found" });
    }

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
      const currentOrgId =
        (req as any).orgId || (user.organisations?.[0]?.toString?.() ?? null);
      if (!currentOrgId) {
        return res.status(400).json({ message: "No organisation context available" });
      }
      const orgRoleIndex = (user.organisationRoles ?? []).findIndex(
        (o: any) => o.organisation.toString() === currentOrgId.toString(),
      );
      if (orgRoleIndex > -1 && user.organisationRoles) {
        (user.organisationRoles as any)[orgRoleIndex].roles = roles;
        if ((req as any).body?.memberKind !== undefined) {
          (user.organisationRoles as any)[orgRoleIndex].memberKind =
            normalizeOrgMemberKind((req as any).body.memberKind);
        }
      } else {
        user.organisationRoles = [
          ...(user.organisationRoles ?? []),
          {
            organisation: currentOrgId as any,
            roles,
            memberKind: normalizeOrgMemberKind(
              (req as any).body?.memberKind,
            ),
          },
        ];
      }
      await user.save();
    }

    res.json({ message: "User roles updated successfully", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      roles,
      organisation,
      organisations,
      organisationRoles,
      isSuperAdmin: bodyIsSuperAdmin,
    } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      isSuperAdminUser((req as any).user) &&
      typeof bodyIsSuperAdmin === "boolean"
    ) {
      (user as any).isSuperAdmin = bodyIsSuperAdmin;
    }

    /** Super admins use a virtual org list in API responses; do not persist client-sent org graphs. */
    const skipOrgWrites = !!user.isSuperAdmin;

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

    const reqOrgId = (req as any).orgId?.toString?.() ?? null;
    if (reqOrgId && !skipOrgWrites && organisations !== undefined) {
      return res.status(400).json({
        message:
          "Organisation membership cannot be changed from this view; switch organisation in the sidebar to manage another organisation",
      });
    }

    if (roles && !skipOrgWrites) {
      // Backward compat: when a caller only sends flat roles (+ optional single org),
      // keep existing behaviour by syncing the target org role entry.
      if (!Array.isArray(organisationRoles)) {
        const targetOrg =
          reqOrgId || organisation || (user.organisations?.[0] as any);
        if (targetOrg) {
          const orgRoleIndex = (user.organisationRoles ?? []).findIndex(
            (o: any) => o.organisation.toString() === targetOrg.toString()
          );
          if (orgRoleIndex > -1 && user.organisationRoles) {
            (user.organisationRoles as any)[orgRoleIndex].roles = roles;
            if ((req as any).body?.memberKind !== undefined) {
              (user.organisationRoles as any)[orgRoleIndex].memberKind =
                normalizeOrgMemberKind((req as any).body.memberKind);
            }
          } else {
            user.organisationRoles = [
              ...(user.organisationRoles ?? []),
              {
                organisation: targetOrg as any,
                roles,
                memberKind: normalizeOrgMemberKind(
                  (req as any).body?.memberKind,
                ),
              },
            ];
          }
        }
      }
    }

    // Preferred multi-org contract: explicit role mapping per organisation.
    if (!skipOrgWrites && Array.isArray(organisationRoles)) {
      for (const entry of organisationRoles) {
        const orgId = entry?.organisation;
        if (!orgId) {
          return res
            .status(400)
            .json({ message: "Each organisationRoles entry must include organisation" });
        }
        if (reqOrgId && orgId.toString() !== reqOrgId) {
          return res.status(400).json({
            message: "Cannot modify roles for another organisation from this view",
          });
        }
        const exists = await Organization.findById(orgId);
        if (!exists) {
          return res
            .status(400)
            .json({ message: `Organisation ${orgId} not found` });
        }
      }

      const normalized = organisationRoles.map((entry: any) => ({
        organisation: entry.organisation,
        roles:
          Array.isArray(entry.roles) && entry.roles.length > 0
            ? entry.roles
            : [UserRole.APPLICANT],
        memberKind: normalizeOrgMemberKind(entry.memberKind),
      })) as any;

      if (reqOrgId) {
        const other = (user.organisationRoles ?? []).filter(
          (o: any) => o.organisation.toString() !== reqOrgId,
        );
        user.organisationRoles = [...other, ...normalized] as any;
        const hasOrg = (user.organisations ?? []).some(
          (o: any) => o.toString() === reqOrgId,
        );
        if (!hasOrg) {
          user.organisations = [...(user.organisations ?? []), reqOrgId] as any;
          await Group.findOneAndUpdate(
            { organisation: reqOrgId, name: "All Members" },
            { $addToSet: { members: user._id } },
          );
        }
      } else {
        user.organisationRoles = normalized;
      }
    }

    // Multi-org: if `organisations` array is provided, use it directly
    if (!skipOrgWrites && organisations !== undefined && !reqOrgId) {
      if (Array.isArray(organisations)) {
        // Validate all org IDs exist
        for (const orgId of organisations) {
          const exists = await Organization.findById(orgId);
          if (!exists) {
            return res
              .status(400)
              .json({ message: `Organisation ${orgId} not found` });
          }
        }

        // Diff old vs new orgs to sync "All Members" groups
        const oldOrgIds = (user.organisations ?? []).map((o: any) => o.toString());
        const newOrgIds = organisations.map((o: string) => o.toString());
        const addedOrgs = newOrgIds.filter((id) => !oldOrgIds.includes(id));
        const removedOrgs = oldOrgIds.filter((id) => !newOrgIds.includes(id));

        user.organisations = organisations;
        // Keep org-role map aligned to selected organisations.
        if (Array.isArray(user.organisationRoles)) {
          user.organisationRoles = user.organisationRoles.filter((or: any) =>
            newOrgIds.includes(or.organisation.toString()),
          ) as any;
        }
        await user.save();

        // Sync "All Members" groups for newly added / removed orgs
        for (const orgId of addedOrgs) {
          await Group.findOneAndUpdate(
            { organisation: orgId, name: "All Members" },
            { $addToSet: { members: user._id } }
          );
        }
        for (const orgId of removedOrgs) {
          await Group.findOneAndUpdate(
            { organisation: orgId, name: "All Members" },
            { $pull: { members: user._id } }
          );
        }
      }
    } else if (!skipOrgWrites && organisation !== undefined) {
      if (reqOrgId && organisation === null) {
        return res.status(400).json({
          message: "Removing all organisation memberships is not available from this view",
        });
      }
      if (
        reqOrgId &&
        organisation &&
        organisation.toString() !== reqOrgId
      ) {
        return res.status(400).json({
          message: "Cannot assign a different organisation from this view",
        });
      }
      // Legacy single-org handling (backward compat)
      if (organisation === null) {
        // Remove from all current org "All Members" groups
        const oldOrgIds = (user.organisations ?? []).map((o: any) => o.toString());
        user.organisations = [];
        await user.save();
        for (const orgId of oldOrgIds) {
          await Group.findOneAndUpdate(
            { organisation: orgId, name: "All Members" },
            { $pull: { members: user._id } }
          );
        }
      } else if (organisation) {
        const orgExists = await Organization.findById(organisation);
        if (!orgExists)
          return res.status(400).json({ message: "Organisation not found" });
        const alreadyMember = (user.organisations ?? []).some(
          (o: any) => o.toString() === organisation.toString(),
        );
        if (!alreadyMember) {
          user.organisations = [...(user.organisations ?? []), organisation];
          await user.save();
          // Add to new org's "All Members" group
          await Group.findOneAndUpdate(
            { organisation: organisation, name: "All Members" },
            { $addToSet: { members: user._id } }
          );
        } else {
          await user.save();
        }
      }
    } else {
      await user.save();
    }

    const updated = await User.findById(user._id)
      .populate("organisations", "name logo")
      .select("-password");

    res.json({ message: "User updated successfully", user: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: get all tasks created by a specific user (bypasses visibility rules).
 */
export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const includeArchivedLegacy =
      String((req as any).query?.includeArchived || "") === "true";
    const lifecycleMode = parseTaskLifecycle(
      (req as any).query?.lifecycle,
      includeArchivedLegacy,
    );
    if (!(await assertTaskLifecycleAccess(req as any, res, lifecycleMode)))
      return;

    const userId = new mongoose.Types.ObjectId(String(req.params.id));
    const taskFilter: any = { createdBy: userId };
    if ((req as any).orgId) {
      taskFilter.organisation = (req as any).orgId;
    }
    const query = andWithLifecycle(taskFilter, lifecycleMode);
    const tasks = await Task.find(query)
      .populate("category", "name code icon")
      .populate("rewardType", "name code")
      .populate("organisation", "name slug")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Applicant counts
    const taskIds = tasks.map((t) => t._id);
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const result = tasks.map((t) => ({
      ...t.toObject(),
      applicantsCount: countMap.get(t._id.toString()) || 0,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: get all applications submitted by a specific user (bypasses own-only rules).
 */
export const getUserApplications = async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(String(req.params.id));
    const appFilter: any = { applicant: userId };
    if ((req as any).orgId) {
      const orgTaskIds = await Task.distinct("_id", {
        organisation: (req as any).orgId,
      });
      appFilter.task = { $in: orgTaskIds };
    }
    const apps = await Application.find(appFilter)
      .populate(
        "task",
        "title status category organisation applicationOpenDate applicationCloseDate startDate",
      )
      .populate("applicant", "name email")
      .sort({ createdAt: -1 });
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isSuperAdmin) {
      return res.status(403).json({
        message: "Super admin accounts cannot be deleted from this endpoint",
      });
    }

    // Prevent deleting self
    if (user._id.toString() === (req as any).user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const orgId = (req as any).orgId as string | null | undefined;
    if (orgId) {
      const inOrg = (user.organisations ?? []).some(
        (o: any) => o.toString() === orgId.toString(),
      );
      if (!inOrg) return res.status(404).json({ message: "User not found" });

      const remaining = (user.organisations ?? []).filter(
        (o: any) => o.toString() !== orgId.toString(),
      );
      user.organisations = remaining as any;
      user.organisationRoles = (user.organisationRoles ?? []).filter(
        (o: any) => o.organisation.toString() !== orgId.toString(),
      ) as any;

      await Group.findOneAndUpdate(
        { organisation: orgId, name: "All Members" },
        { $pull: { members: user._id } },
      );

      if (remaining.length === 0) {
        await user.deleteOne();
        return res.json({ message: "User removed and account deleted" });
      }
      await user.save();
      return res.json({ message: "User removed from this organisation" });
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

    if (!(req as any).orgId) {
      return res.status(400).json({
        message: "Select an organisation to import users into",
      });
    }
    const importOrgId = new mongoose.Types.ObjectId(
      String((req as any).orgId),
    );

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
    let updated = 0;
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

        const organisationId = importOrgId;

        const mappedGender =
          row.gender?.toUpperCase() === "M"
            ? "Male"
            : row.gender?.toUpperCase() === "F"
              ? "Female"
              : undefined;

        let user = await User.findOne({ email });
        if (!user) {
          const password = row.login_id || "Teacher123!"; // Default password strategy
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          const userObj: any = {
            name,
            email,
            password: hashedPassword,
            ...(mappedGender && { gender: mappedGender }),
            ...(row.year_level && { yearLevel: row.year_level }),
            organisations: [organisationId],
            organisationRoles: [
              {
                organisation: organisationId,
                roles: rolesArray,
                memberKind: normalizeOrgMemberKind(row.member_kind),
              },
            ],
          };
          user = new User(userObj);
          await user.save();
          await Group.findOneAndUpdate(
            { organisation: organisationId, name: "All Members" },
            { $addToSet: { members: user._id } },
          );
          imported++;
        } else {
          let dirty = false;
          const userIsSAML = !!user.oidcId;
          const alreadyInImportOrg = (user.organisations ?? []).some(
            (o: any) => o.toString() === organisationId.toString(),
          );

          if (!alreadyInImportOrg && !userIsSAML) {
            user.organisations = [...(user.organisations ?? []), organisationId as any];
            user.organisationRoles = [
              ...(user.organisationRoles ?? []),
              {
                organisation: organisationId,
                roles: rolesArray,
                memberKind: normalizeOrgMemberKind(row.member_kind),
              },
            ];
            dirty = true;
          }

          if (dirty) {
            await Group.findOneAndUpdate(
              { organisation: organisationId, name: "All Members" },
              { $addToSet: { members: user._id } },
            );
            await user.save();
            updated++;
          } else {
            console.log(`Skipping user (already in organisation or SAML): ${email}`);
            errors++;
          }
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

    const parts = [`Added ${imported}`];
    if (updated > 0) parts.push(`Updated ${updated}`);
    if (errors > 0) parts.push(`Skipped/Errors: ${errors}`);

    res.json({ message: `Import complete. ${parts.join(", ")}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
