import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasPermission, Permission, RolePermissions } from '../permissions.ts';
import { UserRole } from '../../models/UserRole.ts';

describe('hasPermission', () => {
  it('should return true for GLOBAL_ADMIN for any permission', () => {
    // GLOBAL_ADMIN has all permissions
    const permissions = Object.values(Permission);
    permissions.forEach((permission) => {
      assert.strictEqual(hasPermission(UserRole.GLOBAL_ADMIN, permission), true);
    });
  });

  it('should return true for SCHOOL_ADMIN for allowed permissions', () => {
    // SCHOOL_ADMIN has specific permissions like TASK_CREATE
    assert.strictEqual(hasPermission(UserRole.SCHOOL_ADMIN, Permission.TASK_CREATE), true);
    assert.strictEqual(hasPermission(UserRole.SCHOOL_ADMIN, Permission.APPLICATION_READ), true);
  });

  it('should return false for SCHOOL_ADMIN for disallowed permissions', () => {
    // SCHOOL_ADMIN does not have ADMIN_SETTINGS permission
    assert.strictEqual(hasPermission(UserRole.SCHOOL_ADMIN, Permission.ADMIN_SETTINGS), false);
  });

  it('should return true for APPLICANT for allowed permissions', () => {
    // APPLICANT has TASK_READ permission
    assert.strictEqual(hasPermission(UserRole.APPLICANT, Permission.TASK_READ), true);
  });

  it('should return false for APPLICANT for disallowed permissions', () => {
    // APPLICANT does not have TASK_CREATE permission
    assert.strictEqual(hasPermission(UserRole.APPLICANT, Permission.TASK_CREATE), false);
  });

  it('should return false for unknown role', () => {
    // @ts-expect-error Testing invalid role
    assert.strictEqual(hasPermission('UNKNOWN_ROLE' as UserRole, Permission.TASK_READ), false);
  });

  it('should return false for unknown permission', () => {
    // @ts-expect-error Testing invalid permission
    assert.strictEqual(hasPermission(UserRole.GLOBAL_ADMIN, 'UNKNOWN_PERMISSION' as Permission), false);
  });
});
