export const UserRole = {
  GLOBAL_ADMIN: "Global Admin",
  SCHOOL_ADMIN: "School Admin",
  TASK_MANAGER: "Task Manager",
  TASK_ADVERTISER: "Task Advertiser",
  APPLICANT: "Applicant",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Normalizes a role string to match the defined UserRole values.
 * Handles case-insensitivity and replaces underscores with spaces.
 *
 * @param v The role string to normalize
 * @returns The normalized UserRole or the original string if no match is found
 */
export const normalizeUserRole = (v: any): any => {
  if (typeof v !== 'string' || !v) return v;
  // Find existing role value matching case-insensitively (handling both spaces and underscores)
  const role = Object.values(UserRole).find(
    (r) =>
      r.toLowerCase() === v.toLowerCase() ||
      r.toLowerCase() === v.toLowerCase().replace(/_/g, " "),
  );
  return role || v;
};
