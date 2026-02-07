import { Request, Response } from "express";
import Role, { IRole } from "../models/Role.js";
import Permission, { IPermission } from "../models/Permission.js";
import User from "../models/User.js";

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
        .status(400)
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
    const roles = await Role.find().sort({ isSystem: -1, name: 1 });
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);

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
    const { name, code, description, permissions, color } = req.body;

    const existing = await Role.findOne({ code: code.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Role code already exists" });
    }

    const role = await Role.create({
      name,
      code: code.toLowerCase(),
      description,
      permissions: permissions || [],
      color: color || "#6B7280",
      isSystem: false,
      isActive: true,
    });

    res.status(201).json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, color, isActive } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
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
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(400).json({ message: "Cannot delete system role" });
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
    const { roleId } = req.params;
    const { permissionCode } = req.body;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
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
    const { roleId, permissionCode } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
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
        code: "user:manage_roles",
        name: "Manage User Roles",
        category: "Users",
        isSystem: true,
      },

      // Organization permissions
      {
        code: "org:create",
        name: "Create Organization",
        category: "Organization",
        isSystem: true,
      },
      {
        code: "org:read",
        name: "View Organization",
        category: "Organization",
        isSystem: true,
      },
      {
        code: "org:update",
        name: "Update Organization",
        category: "Organization",
        isSystem: true,
      },
      {
        code: "org:delete",
        name: "Delete Organization",
        category: "Organization",
        isSystem: true,
      },
      {
        code: "org:manage_members",
        name: "Manage Members",
        category: "Organization",
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
        name: "Global Admin",
        code: "global_admin",
        description: "Manage tenants, global settings, onboarding",
        permissions: allPermissions,
        isSystem: true,
        color: "#DC2626", // Red
      },
      {
        name: "School Admin",
        code: "school_admin",
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
          "application:read",
          "application:shortlist",
          "application:approve",
          "application:reject",
          "org:read",
          "org:update",
          "org:manage_members",
          "user:read",
          "user:update",
          "user:manage_roles",
          "dashboard:view",
          "analytics:view",
          "reports:view",
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
          "task:read",
          "task:approve",
          "task:publish",
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

    for (const role of defaultRoles) {
      await Role.findOneAndUpdate({ code: role.code }, role, {
        upsert: true,
        new: true,
      });
    }

    // Cleanup old roles
    const newRoleCodes = defaultRoles.map((r) => r.code);
    // Delete roles that are system roles but NOT in the new list
    // OR just delete specific old standard roles if they exist
    const oldRoleCodes = [
      "admin",
      "owner",
      "approver",
      "member",
      "independent",
    ];

    // Migrate existing users to new roles
    const roleMapping: Record<string, string> = {
      admin: "Global Admin",
      owner: "School Admin",
      approver: "Task Manager",
      member: "Task Advertiser",
      independent: "Applicant",
    };

    for (const [oldRole, newRole] of Object.entries(roleMapping)) {
      await User.updateMany(
        { role: { $regex: new RegExp(`^${oldRole}$`, "i") } },
        { role: newRole },
      );
    }

    // We only delete them if they are NOT in the new codes (which they aren't)
    // And to be safe, we might check if they are system roles or just delete by code
    await Role.deleteMany({ code: { $in: oldRoleCodes } });

    res.json({
      message:
        "Default permissions and roles seeded successfully. Old roles removed.",
      permissions: defaultPermissions.length,
      roles: defaultRoles.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
