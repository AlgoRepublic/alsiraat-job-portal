import { Request, Response } from "express";
import Role, { IRole } from "../models/Role.js";
import Permission, { IPermission } from "../models/Permission.js";
import User from "../models/User.js";
import { isSuperAdminUser } from "../utils/superAdmin.js";
import {
  assertResourceOrganisationScope,
  resolveMutationOrganisation,
} from "../utils/orgMutationScope.js";

/** Roles visible in admin for the current JWT organisation context. */
function buildRoleReadFilter(req: any): Record<string, unknown> {
  const orgId = req.orgId?.toString?.() ?? null;
  const orgScopeOr = [
    { organisation: orgId },
    { organisation: null },
    { organisation: { $exists: false } },
  ] as const;
  if (orgId) {
    return { $or: [...orgScopeOr] };
  }
  if (!isSuperAdminUser(req.user)) {
    return {
      $or: [
        { organisation: null },
        { organisation: { $exists: false } },
      ],
    };
  }
  return {};
}

function assertRoleMutableForOrgSession(role: any, req: any) {
  if (role.isSystem) return;
  const ro = role.organisation?.toString?.() ?? null;
  if (ro) {
    assertResourceOrganisationScope(req, ro);
    return;
  }
  const effective = resolveMutationOrganisation(req);
  if (!effective) {
    const err: any = new Error(
      "Pass organisation query parameter or select an active organisation",
    );
    err.status = 400;
    throw err;
  }
}

// ============================================================================
// PERMISSION CONTROLLERS
// ============================================================================

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.json(permissions);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createPermission = async (req: Request, res: Response) => {
  try {
    const { code, name, description, category } = req.body;

    const existing = await Permission.findOne({ code: code.toLowerCase() });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Permission code already exists" });
    }

    const permission = await Permission.create({
      code: code.toLowerCase(),
      name,
      description,
      category,
      isSystem: false,
    });

    res.status(201).json(permission);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;

    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    // System permissions can only update name/description, not code
    if (
      permission.isSystem &&
      req.body.code &&
      req.body.code !== permission.code
    ) {
      return res
        .status(400)
        .json({ message: "Cannot change code of system permission" });
    }

    permission.name = name || permission.name;
    permission.description = description ?? permission.description;
    permission.category = category || permission.category;

    await permission.save();
    res.json(permission);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    if (permission.isSystem) {
      return res
        .status(403)
        .json({ message: "Cannot delete system permission" });
    }

    // Remove permission from all roles
    await Role.updateMany(
      { permissions: permission.code },
      { $pull: { permissions: permission.code } },
    );

    await permission.deleteOne();
    res.json({ message: "Permission deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================================
// ROLE CONTROLLERS
// ============================================================================

export const getRoles = async (req: Request, res: Response) => {
  try {
    const filter = buildRoleReadFilter(req as any);
    const roles = await Role.find(filter).sort({ name: 1 });
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Public read-only endpoint for fetching roles
 * Used for task creation forms where users need to select allowed roles
 * No permissions required - all authenticated users can access
 */
export const getRolesPublic = async (req: Request, res: Response) => {
  try {
    const filter = buildRoleReadFilter(req as any);
    const roles = await Role.find({ isActive: true, ...filter })
      .select("_id name code color description isSystem")
      .sort({ name: 1 });
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const readFilter = buildRoleReadFilter(req as any);
    const role = await Role.findOne({
      $and: [{ _id: id }, readFilter],
    });

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }
    const { name, code, description, permissions, color, oidcMapping } = req.body;
    const orgId = (req as any).orgId?.toString?.() ?? null;
    if (!orgId) {
      return res.status(400).json({
        message: "Select an organisation to create roles",
      });
    }
    const codeLower = code.toLowerCase();

    const existing = await Role.findOne({
      code: codeLower,
      organisation: orgId,
    });
    if (existing) {
      return res.status(400).json({ message: "Role code already exists" });
    }

    const role = await Role.create({
      name,
      code: codeLower,
      description,
      permissions: permissions || [],
      color: color || "#6B7280",
      oidcMapping: Array.isArray(oidcMapping) ? oidcMapping.map((v: string) => v.trim()).filter(Boolean) : [],
      isSystem: false,
      isActive: true,
      organisation: orgId,
    });

    res.status(201).json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }
    const { id } = req.params;
    const { name, description, permissions, color, isActive, oidcMapping } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    try {
      assertRoleMutableForOrgSession(role, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    // System roles can update permissions but not code/isSystem
    if (role.isSystem && req.body.code && req.body.code !== role.code) {
      return res
        .status(400)
        .json({ message: "Cannot change code of system role" });
    }

    role.name = name || role.name;
    role.description = description ?? role.description;
    role.permissions = permissions ?? role.permissions;
    role.color = color || role.color;
    role.oidcMapping = Array.isArray(oidcMapping)
      ? oidcMapping.map((v: string) => v.trim()).filter(Boolean)
      : role.oidcMapping;

    // Cannot deactivate system roles
    if (!role.isSystem) {
      role.isActive = isActive ?? role.isActive;
    }

    await role.save();
    res.json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(403).json({ message: "Cannot delete system role" });
    }

    try {
      assertRoleMutableForOrgSession(role, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return res.status(400).json({
        message: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`,
      });
    }

    await role.deleteOne();
    res.json({ message: "Role deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================================
// ROLE-PERMISSION MANAGEMENT
// ============================================================================

export const assignPermissionToRole = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }
    const { roleId } = req.params;
    const { permissionCode } = req.body;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    try {
      assertRoleMutableForOrgSession(role, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    const permission = await Permission.findOne({ code: permissionCode });
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    if (!role.permissions.includes(permissionCode)) {
      role.permissions.push(permissionCode);
      await role.save();
    }

    res.json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const removePermissionFromRole = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }
    const { roleId, permissionCode } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    try {
      assertRoleMutableForOrgSession(role, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    role.permissions = role.permissions.filter((p) => p !== permissionCode);
    await role.save();

    res.json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================================
// SEED DEFAULT PERMISSIONS & ROLES
// ============================================================================

export const seedDefaultPermissions = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }
    const hasOrgContext = !!(req as any).orgId?.toString?.();

    // ── Normalize legacy category names in existing permissions ──────────────
    // When resetDatabase.ts ran, it used raw enum prefix as category (e.g. "TASK",
    // "APPLICATION"). We consolidate those into the canonical plural display names.
    const categoryRenames: Record<string, string> = {
      TASK: "Tasks",
      Task: "Tasks",
      APPLICATION: "Applications",
      Application: "Applications",
      USER: "Users",
      User: "Users",
      ORG: "Organisation",
      Org: "Organisation",
      DASHBOARD: "Dashboard",
      ANALYTICS: "Dashboard",
      Analytics: "Dashboard",
      REPORTS: "Reports",
      Report: "Reports",
      ADMIN: "Admin",
    };
    for (const [oldCat, newCat] of Object.entries(categoryRenames)) {
      if (oldCat !== newCat) {
        await Permission.updateMany({ category: oldCat }, { $set: { category: newCat } });
      }
    }

    const defaultPermissions = [
      // Task permissions
      {
        code: "task:create",
        name: "Create Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:read",
        name: "View Tasks",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:update",
        name: "Update Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:delete",
        name: "Delete Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:submit",
        name: "Submit Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:approve",
        name: "Approve Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:publish",
        name: "Publish Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:archive",
        name: "Archive Task",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:complete",
        name: "Mark Task Complete",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:view_pending",
        name: "View Pending Tasks",
        category: "Tasks",
        isSystem: true,
      },
      {
        code: "task:auto_publish",
        name: "Auto Publish Tasks",
        category: "Tasks",
        isSystem: true,
      },

      // Application permissions
      {
        code: "application:create",
        name: "Apply for Task",
        category: "Applications",
        isSystem: true,
      },
      {
        code: "application:read",
        name: "View Applications",
        category: "Applications",
        isSystem: true,
      },
      {
        code: "application:read_own",
        name: "View Own Applications",
        category: "Applications",
        isSystem: true,
      },
      {
        code: "application:shortlist",
        name: "Shortlist Application",
        category: "Applications",
        isSystem: true,
      },
      {
        code: "application:approve",
        name: "Approve Application",
        category: "Applications",
        isSystem: true,
      },
      {
        code: "application:reject",
        name: "Reject Application",
        category: "Applications",
        isSystem: true,
      },
      {
        code: "application:confirm",
        name: "Confirm Offer",
        category: "Applications",
        isSystem: true,
      },

      // User permissions
      {
        code: "user:create",
        name: "Create User",
        category: "Users",
        isSystem: true,
      },
      {
        code: "user:read",
        name: "View Users",
        category: "Users",
        isSystem: true,
      },
      {
        code: "user:update",
        name: "Update Users",
        category: "Users",
        isSystem: true,
      },
      {
        code: "user:delete",
        name: "Delete Users",
        category: "Users",
        isSystem: true,
      },
      {
        code: "user:impersonate",
        name: "Impersonate Users",
        category: "Users",
        isSystem: true,
      },
      {
        code: "user:import",
        name: "Import Users CSV",
        category: "Users",
        isSystem: true,
      },
      {
        code: "user:manage_roles",
        name: "Manage User Roles",
        category: "Users",
        isSystem: true,
      },

      // Organisation permissions
      {
        code: "org:create",
        name: "Create Organisation",
        category: "Organisation",
        isSystem: true,
      },
      {
        code: "org:read",
        name: "View Organisation",
        category: "Organisation",
        isSystem: true,
      },
      {
        code: "org:update",
        name: "Update Organisation",
        category: "Organisation",
        isSystem: true,
      },
      {
        code: "org:delete",
        name: "Delete Organisation",
        category: "Organisation",
        isSystem: true,
      },
      {
        code: "org:manage_members",
        name: "Manage Members",
        category: "Organisation",
        isSystem: true,
      },

      // Dashboard & Reports permissions
      {
        code: "dashboard:view",
        name: "View Dashboard",
        category: "Dashboard",
        isSystem: true,
      },
      {
        code: "analytics:view",
        name: "View Analytics",
        category: "Dashboard",
        isSystem: true,
      },
      {
        code: "reports:view",
        name: "Run Reports",
        category: "Reports",
        isSystem: true,
      },
      {
        code: "reports:export",
        name: "Export Reports",
        category: "Reports",
        isSystem: true,
      },
      {
        code: "reports:create",
        name: "Create Reports",
        category: "Reports",
        isSystem: true,
      },

      // Admin permissions
      {
        code: "admin:settings",
        name: "Admin Settings",
        category: "Admin",
        isSystem: true,
      },
      {
        code: "admin:audit_log",
        name: "View Audit Log",
        category: "Admin",
        isSystem: true,
      },
      {
        code: "admin:manage_roles",
        name: "Manage Roles",
        category: "Admin",
        isSystem: true,
      },
      {
        code: "admin:manage_permissions",
        name: "Manage Permissions",
        category: "Admin",
        isSystem: true,
      },
      {
        code: "admin:manage_tenants",
        name: "Manage Tenants",
        category: "Admin",
        isSystem: true,
      },
    ];

    for (const perm of defaultPermissions) {
      await Permission.findOneAndUpdate({ code: perm.code }, perm, {
        upsert: true,
        new: true,
      });
    }

    // Create default roles
    const allPermissions = defaultPermissions.map((p) => p.code);

    const defaultRoles = [
      {
        name: "Organisation Admin",
        code: "organization_admin",
        description: "Oversee tasks, manage roles, run reports",
        permissions: [
          "task:create",
          "task:read",
          "task:update",
          "task:delete",
          "task:approve",
          "task:publish",
          "task:archive",
          "task:submit",
          "task:view_pending",
          "task:auto_publish",
          "application:read",
          "application:shortlist",
          "application:approve",
          "application:reject",
          "org:read",
          "org:update",
          "org:manage_members",
          "user:create",
          "user:read",
          "user:update",
          "user:import",
          "user:manage_roles",
          "dashboard:view",
          "analytics:view",
          "reports:view",
          "reports:export",
          "reports:create",
          "admin:settings",
        ],
        isSystem: true,
        color: "#7C3AED", // Violet
      },
      {
        name: "Task Manager",
        code: "task_manager",
        description: "Review, publish, shortlist, issue offers and rewards",
        permissions: [
          "task:create",
          "task:read",
          "task:update",
          "task:approve",
          "task:publish",
          "task:view_pending",
          "task:auto_publish",
          "application:read",
          "application:shortlist",
          "application:approve",
          "application:reject",
          "dashboard:view",
        ],
        isSystem: true,
        color: "#2563EB", // Blue
      },
      {
        name: "Task Advertiser",
        code: "task_advertiser",
        description: "Create, edit, submit tasks",
        permissions: [
          "task:create",
          "task:read",
          "task:update",
          "task:submit",
          "application:read_own",
        ],
        isSystem: true,
        color: "#059669", // Emerald
      },
      {
        name: "Applicant",
        code: "applicant",
        description: "Browse, apply, manage history and skills",
        permissions: [
          "task:read",
          "application:create",
          "application:read_own",
          "application:confirm",
          "application:reject",
        ],
        isSystem: true,
        color: "#D97706", // Amber
      },
    ];

    // System role *definitions* (organisation: null) are shared platform templates used
    // by every tenant. Only upsert them during platform maintenance — not when an admin
    // has an active organisation selected (tenant reset should not rewrite global rows).
    if (!hasOrgContext) {
      for (const role of defaultRoles) {
        await Role.findOneAndUpdate(
          { code: role.code, organisation: null },
          { ...role, organisation: null },
          {
            upsert: true,
            new: true,
          },
        );
      }
    }

    // Platform-wide legacy cleanup (destructive): only when no JWT organisation context.
    if (!hasOrgContext) {
      const oldRoleCodes = [
        "admin",
        "owner",
        "approver",
        "member",
        "global_admin",
      ];

      const roleMapping: Record<string, string> = {
        admin: "Organisation Admin",
        owner: "Organisation Admin",
        approver: "Task Manager",
        member: "Task Advertiser",
      };

      for (const [oldRole, newRole] of Object.entries(roleMapping)) {
        await User.updateMany(
          { role: { $regex: new RegExp(`^${oldRole}$`, "i") } },
          { role: newRole },
        );
      }

      await User.updateMany(
        { role: { $regex: /^school admin$/i } },
        { role: "Organisation Admin" },
      );
      await Role.deleteMany({ code: "school_admin" });
      await Role.deleteMany({ name: { $regex: /^global admin$/i } });

      await Role.deleteMany({ code: { $in: oldRoleCodes } });

      const deprecatedPermCodes = ["task:view_internal"];
      await Permission.deleteMany({ code: { $in: deprecatedPermCodes } });
      await Role.updateMany(
        { permissions: { $in: deprecatedPermCodes } },
        { $pull: { permissions: { $in: deprecatedPermCodes } } },
      );
    }

    res.json({
      message: hasOrgContext
        ? "Permission catalog updated. Shared system role templates (organisation-wide defaults) were not modified — clear the active organisation and run again for full platform seed."
        : "Default permissions and roles seeded successfully. Old roles and deprecated permissions removed.",
      permissions: defaultPermissions.length,
      roles: defaultRoles.length,
      systemRolesUpsertedToPlatform: !hasOrgContext ? defaultRoles.length : 0,
      organisationScoped: hasOrgContext,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
