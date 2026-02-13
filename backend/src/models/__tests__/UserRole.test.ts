import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { UserRole, normalizeUserRole } from '../UserRole.ts';

describe('UserRole Normalization', () => {
  it('should return exact match', () => {
    assert.strictEqual(normalizeUserRole(UserRole.GLOBAL_ADMIN), UserRole.GLOBAL_ADMIN);
    assert.strictEqual(normalizeUserRole(UserRole.APPLICANT), UserRole.APPLICANT);
  });

  it('should normalize lowercase roles', () => {
    assert.strictEqual(normalizeUserRole('global admin'), UserRole.GLOBAL_ADMIN);
    assert.strictEqual(normalizeUserRole('applicant'), UserRole.APPLICANT);
  });

  it('should normalize uppercase roles', () => {
    assert.strictEqual(normalizeUserRole('GLOBAL ADMIN'), UserRole.GLOBAL_ADMIN);
    assert.strictEqual(normalizeUserRole('APPLICANT'), UserRole.APPLICANT);
  });

  it('should handle underscores instead of spaces', () => {
    assert.strictEqual(normalizeUserRole('global_admin'), UserRole.GLOBAL_ADMIN);
    assert.strictEqual(normalizeUserRole('school_admin'), UserRole.SCHOOL_ADMIN);
    assert.strictEqual(normalizeUserRole('task_manager'), UserRole.TASK_MANAGER);
  });

  it('should handle mixed case and underscores', () => {
    assert.strictEqual(normalizeUserRole('Global_Admin'), UserRole.GLOBAL_ADMIN);
    assert.strictEqual(normalizeUserRole('TASK_advertiser'), UserRole.TASK_ADVERTISER);
  });

  it('should return original value for unknown roles', () => {
    assert.strictEqual(normalizeUserRole('unknown role'), 'unknown role');
    assert.strictEqual(normalizeUserRole('Super Admin'), 'Super Admin');
  });

  it('should handle empty or null-ish values', () => {
    assert.strictEqual(normalizeUserRole(''), '');
    assert.strictEqual(normalizeUserRole(null), null);
    assert.strictEqual(normalizeUserRole(undefined), undefined);
  });

  it('should handle non-string values gracefully', () => {
    assert.strictEqual(normalizeUserRole(123), 123);
    const obj = {};
    assert.strictEqual(normalizeUserRole(obj), obj);
    assert.strictEqual(normalizeUserRole(true), true);
  });
});
