import mongoose from "mongoose";
import Task from "../models/Task.js";
import TaskCategory from "../models/TaskCategory.js";
import {
  pickCategoryIdForLegacyName,
  type TaskCategoryMatchRow,
} from "./taskCategoryReference.js";

export type TaskCategoryBackfillStats = {
  tasksScanned: number;
  categoryIdsSet: number;
  alreadyHadCategoryId: number;
  zeroMatchReported: number;
  zeroMatchTaskIds: string[];
};

export async function runTaskCategoryIdBackfill(): Promise<TaskCategoryBackfillStats> {
  const stats: TaskCategoryBackfillStats = {
    tasksScanned: 0,
    categoryIdsSet: 0,
    alreadyHadCategoryId: 0,
    zeroMatchReported: 0,
    zeroMatchTaskIds: [],
  };

  const categories = await TaskCategory.find({
    organisation: { $ne: null },
  })
    .select("organisation name updatedAt")
    .lean();

  const categoriesByOrg = new Map<string, TaskCategoryMatchRow[]>();
  for (const row of categories) {
    const orgId = row.organisation?.toString();
    if (!orgId) continue;
    const bucket = categoriesByOrg.get(orgId) ?? [];
    bucket.push({
      _id: String(row._id),
      name: row.name,
      updatedAt: row.updatedAt,
    });
    categoriesByOrg.set(orgId, bucket);
  }

  const tasks = await Task.find({
    organisation: { $exists: true, $ne: null },
    category: { $exists: true, $type: "string", $ne: "" },
  }).select("_id organisation category categoryId");

  for (const task of tasks) {
    stats.tasksScanned++;
    if (task.categoryId) {
      stats.alreadyHadCategoryId++;
      continue;
    }

    const orgId = task.organisation?.toString();
    const legacyName = typeof task.category === "string" ? task.category : "";
    if (!orgId || !legacyName.trim()) continue;

    const orgCategories = categoriesByOrg.get(orgId) ?? [];
    const matchedId = pickCategoryIdForLegacyName(legacyName, orgCategories);
    if (!matchedId) {
      stats.zeroMatchReported++;
      stats.zeroMatchTaskIds.push(task._id.toString());
      continue;
    }

    await Task.updateOne(
      { _id: task._id },
      { $set: { categoryId: new mongoose.Types.ObjectId(matchedId) } },
    );
    stats.categoryIdsSet++;
  }

  return stats;
}
