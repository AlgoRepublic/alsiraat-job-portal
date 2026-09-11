import { ITask, TaskVisibility } from "../models/Task.js";
import {
  notify,
  sendNotificationToAll,
  sendNotificationToOrganization,
} from "./notificationService.js";

export async function runTaskPublishSideEffects(task: ITask): Promise<void> {
  await notify({
    recipientId: task.createdBy.toString(),
    title: "✅ Task Published!",
    message: `Your task "${task.title}" has been approved and is now live.`,
    type: "success",
    link: `/jobs/${task._id}`,
  });

  if (
    task.visibility === TaskVisibility.CENTRAL ||
    task.visibility === TaskVisibility.EXTERNAL
  ) {
    await sendNotificationToAll(
      "📢 New Task Available!",
      `A new task "${task.title}" has been posted.`,
      "info",
      `/jobs/${task._id}`,
      task.createdBy.toString(),
    );
  } else if (
    task.visibility === TaskVisibility.INTERNAL &&
    task.organisation
  ) {
    await sendNotificationToOrganization(
      task.organisation.toString(),
      "📢 New Internal Task",
      `A new internal task "${task.title}" has been posted.`,
      "info",
      `/jobs/${task._id}`,
      task.createdBy.toString(),
    );
  } else if (
    task.visibility === TaskVisibility.PRIVATE &&
    task.organisation
  ) {
    await sendNotificationToOrganization(
      task.organisation.toString(),
      "📢 New Private Task",
      `A new private task "${task.title}" has been posted.`,
      "info",
      `/jobs/${task._id}`,
      task.createdBy.toString(),
    );
  }
}
