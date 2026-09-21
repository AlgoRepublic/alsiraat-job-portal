import {
  presentTaskRecord,
  taskCategoryIdPopulate,
} from "../services/taskCategoryReference.js";

/** Populate embedded task on applications with org catalogue category for display. */
export const applicationTaskPopulate = {
  path: "task",
  populate: taskCategoryIdPopulate,
};

export function presentApplicationForClient(app: unknown): Record<string, unknown> {
  const base =
    app != null &&
    typeof app === "object" &&
    typeof (app as { toObject?: () => unknown }).toObject === "function"
      ? (app as { toObject: () => Record<string, unknown> }).toObject()
      : { ...(app as Record<string, unknown>) };
  if (base.task != null && typeof base.task === "object") {
    base.task = presentTaskRecord(base.task);
  }
  return base;
}

export function presentApplicationsForClient(
  apps: unknown[],
): Record<string, unknown>[] {
  return apps.map((app) => presentApplicationForClient(app));
}
