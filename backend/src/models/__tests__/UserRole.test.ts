import { describe, it } from "node:test";
import assert from "node:assert";
import { UserRole, normalizeUserRole } from "../UserRole.js";

describe("normalizeUserRole", () => {
  it("normalizes canonical roles", () => {
    assert.strictEqual(normalizeUserRole(UserRole.ORGANIZATION_ADMIN), UserRole.ORGANIZATION_ADMIN);
  });

  it("maps legacy global admin strings to Organisation Admin (role enum no longer has Global Admin)", () => {
    assert.strictEqual(normalizeUserRole("global admin"), UserRole.ORGANIZATION_ADMIN);
    assert.strictEqual(normalizeUserRole("GLOBAL ADMIN"), UserRole.ORGANIZATION_ADMIN);
    assert.strictEqual(normalizeUserRole("global_admin"), UserRole.ORGANIZATION_ADMIN);
    assert.strictEqual(normalizeUserRole("Global_Admin"), UserRole.ORGANIZATION_ADMIN);
  });

  it("maps admin to Organisation Admin", () => {
    assert.strictEqual(normalizeUserRole("admin"), UserRole.ORGANIZATION_ADMIN);
  });
});
