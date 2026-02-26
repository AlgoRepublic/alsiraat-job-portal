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
  if (typeof v !== "string" || !v) return v;

  const normalizedLower = v.toLowerCase().trim();

  // Legacy role mappings
  const legacyMap: Record<string, string> = {
    admin: UserRole.GLOBAL_ADMIN,
    owner: UserRole.SCHOOL_ADMIN,
    approver: UserRole.TASK_MANAGER,
    member: UserRole.TASK_ADVERTISER,
    independent: UserRole.APPLICANT,
    teacher: UserRole.TASK_ADVERTISER,
    staff: UserRole.TASK_ADVERTISER,
    administrative: UserRole.SCHOOL_ADMIN,
    guardian: UserRole.APPLICANT,
    assessor: UserRole.TASK_MANAGER,
  };

  if (legacyMap[normalizedLower]) {
    return legacyMap[normalizedLower];
  }

  // Find existing role value matching case-insensitively (handling both spaces and underscores)
  const role = Object.values(UserRole).find(
    (r) =>
      r.toLowerCase() === normalizedLower ||
      r.toLowerCase() === normalizedLower.replace(/_/g, " "),
  );
  return role || v;
};
