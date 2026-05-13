/**
 * Task shelf (archivedAt) and soft delete (deletedAt). Workflow no longer uses status "Archived".
 */

import type { Response } from "express";
import { Permission } from "../config/permissions.js";

export type TaskLifecycleMode = "active" | "archived" | "deleted";

export async function assertTaskLifecycleAccess(
  req: any,
  res: Response,
  mode: TaskLifecycleMode,
): Promise<boolean> {
  if (mode === "active") return true;
  if (!req.user) {
    res.status(403).json({ message: "Authentication required" });
    return false;
  }
  if (req.user.isSuperAdmin) return true;
  const { checkPermissionAsync } = await import("../middleware/rbac.js");
  const perm =
    mode === "deleted" ? Permission.TASK_DELETE : Permission.TASK_ARCHIVE;
  const { allowed } = await checkPermissionAsync(req.user, perm);
  if (!allowed) {
    res.status(403).json({
      message: `Permission denied: ${perm}`,
      required: perm,
    });
    return false;
  }
  return true;
}

export function parseTaskLifecycle(
  lifecycle: unknown,
  includeArchivedLegacy: boolean,
): TaskLifecycleMode {
  if (includeArchivedLegacy) return "archived";
  const s = typeof lifecycle === "string" ? lifecycle.trim().toLowerCase() : "";
  if (s === "archived") return "archived";
  if (s === "deleted") return "deleted";
  return "active";
}

/** Default listings: not soft-deleted and not archived (lifecycle). */
export function activeLifecycleMongoFilter(): Record<string, unknown> {
  return {
    $and: [
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
      { $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }] },
    ],
  };
}

export function archivedLifecycleMongoFilter(): Record<string, unknown> {
  return {
    $and: [
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
      { archivedAt: { $ne: null, $exists: true } },
    ],
  };
}

export function softDeletedLifecycleMongoFilter(): Record<string, unknown> {
  return {
    deletedAt: { $ne: null, $exists: true },
  };
}

/** Merge lifecycle constraint into an existing Mongo filter (may already use $and). */
export function andWithLifecycle(
  base: Record<string, unknown>,
  lifecycle: TaskLifecycleMode,
): Record<string, unknown> {
  const life =
    lifecycle === "archived"
      ? archivedLifecycleMongoFilter()
      : lifecycle === "deleted"
        ? softDeletedLifecycleMongoFilter()
        : activeLifecycleMongoFilter();

  if (!base || Object.keys(base).length === 0) return life;
  return { $and: [base, life] };
}
