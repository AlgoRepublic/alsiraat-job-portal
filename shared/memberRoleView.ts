/** Hydrated Member role for API and client display (id + code + name). */
export type MemberRoleView = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};
