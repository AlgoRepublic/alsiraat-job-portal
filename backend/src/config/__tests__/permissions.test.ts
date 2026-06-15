import { describe, it } from "node:test";
import assert from "node:assert";
import { hasPermission, Permission } from "../permissions.js";
import { UserRole as UR } from "../../models/UserRole.js";

describe("hasPermission (static map)", () => {
  it("should return true for ORGANIZATION_ADMIN for common admin permissions", () => {
    assert.strictEqual(
      hasPermission(UR.ORGANIZATION_ADMIN, Permission.TASK_CREATE),
      true,
    );
    assert.strictEqual(
      hasPermission(UR.ORGANIZATION_ADMIN, Permission.APPLICATION_READ),
      true,
    );
  });

  it("should not grant undefined permissions to ORGANIZATION_ADMIN", () => {
    assert.strictEqual(
      hasPermission(UR.ORGANIZATION_ADMIN, "UNKNOWN_PERMISSION" as Permission),
      false,
    );
  });

  it("should return true for ORGANIZATION_ADMIN, TASK_CREATE", () => {
    assert.strictEqual(
      hasPermission(UR.ORGANIZATION_ADMIN, Permission.TASK_CREATE),
      true,
    );
  });

  it("should return true for APPLICANT, TASK_READ", () => {
    assert.strictEqual(hasPermission(UR.APPLICANT, Permission.TASK_READ), true);
  });

  it("should return false for APPLICANT, TASK_CREATE", () => {
    assert.strictEqual(
      hasPermission(UR.APPLICANT, Permission.TASK_CREATE),
      false,
    );
  });

  it("should return false for unknown role", () => {
    assert.strictEqual(
      hasPermission("UNKNOWN_ROLE" as any, Permission.TASK_READ),
      false,
    );
  });
});
