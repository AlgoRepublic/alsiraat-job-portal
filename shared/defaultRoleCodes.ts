/** Immutable codes for the four default Roles seeded in every Organisation. */
export const DefaultRoleCode = {
  ORGANIZATION_ADMIN: "organization_admin",
  TASK_MANAGER: "task_manager",
  TASK_ADVERTISER: "task_advertiser",
  APPLICANT: "applicant",
} as const;

export type DefaultRoleCode =
  (typeof DefaultRoleCode)[keyof typeof DefaultRoleCode];

export const DEFAULT_ROLE_CODES: readonly DefaultRoleCode[] = [
  DefaultRoleCode.ORGANIZATION_ADMIN,
  DefaultRoleCode.TASK_MANAGER,
  DefaultRoleCode.TASK_ADVERTISER,
  DefaultRoleCode.APPLICANT,
];
