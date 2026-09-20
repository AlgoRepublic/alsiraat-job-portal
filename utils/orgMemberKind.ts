import type { OrgMemberKind } from "../types";

/** Match backend `normalizeOrgMemberKind` for client-side filters. */
export function normalizeOrgMemberKind(value: unknown): OrgMemberKind {
  const v = typeof value === "string" ? value.trim() : "";
  if (v === "External" || v.toLowerCase() === "external") {
    return "External";
  }
  return "Internal";
}

export function groupKindOfGroup(row: { kind?: unknown }): OrgMemberKind {
  return normalizeOrgMemberKind(row.kind);
}
