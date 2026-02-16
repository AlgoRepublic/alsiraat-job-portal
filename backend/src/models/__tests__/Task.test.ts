import { describe, it } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Task, { type ITask } from '../Task.ts';

describe('Task Model Virtuals', () => {
  describe('isExpired', () => {
    it('should return false if endDate is not set', () => {
      const task = new Task({
        title: 'Test Task',
        description: 'Test Description',
        category: 'Test Category',
        location: 'Test Location',
        rewardType: 'Points',
        createdBy: new mongoose.Types.ObjectId() as any,
        organisation: new mongoose.Types.ObjectId() as any,
      }) as any;

      assert.strictEqual(task.endDate, undefined);
      assert.strictEqual(task.isExpired, false);
    });

    it('should return false if endDate is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const task = new Task({
        endDate: futureDate,
      }) as any;

      assert.strictEqual(task.isExpired, false);
    });

    it('should return true if endDate is in the past', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const task = new Task({
        endDate: pastDate,
      }) as any;

      assert.strictEqual(task.isExpired, true);
    });
  });
});
