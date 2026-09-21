import type { ITask } from "../models/Task.js";
import User from "../models/User.js";
import Group from "../models/Group.js";
import { Permission } from "../config/permissions.js";
import { notify } from "./notificationService.js";
import { getMembershipSliceForOrganisation } from "./groupApprovalMembers.js";
import { membershipHasPermission } from "./orgMemberRoleResolver.js";
import {
  loadTaskReviewOrgCatalogue,
  memberHasTaskReviewAccess,
  taskReviewEligibilityTaskFromDocument,
  type TaskReviewEligibilityTask,
  type TaskReviewOrgCatalogue,
} from "./taskReviewEligibility.js";
import { TaskStatus } from "../models/Task.js";

export type TaskReviewNotificationCandidate = {
  userId: string;
  isSuperAdmin: boolean;
  hasTaskApprove: boolean;
  approvalMemberGroupIds: string[];
};

export function selectTaskReviewNotificationRecipientIds(args: {
  organisationId: string;
  task: TaskReviewEligibilityTask;
  catalogue: TaskReviewOrgCatalogue;
  candidates: readonly TaskReviewNotificationCandidate[];
  excludeUserIds?: readonly string[];
}): string[] {
  const exclude = new Set((args.excludeUserIds ?? []).map(String));
  const recipients: string[] = [];

  for (const candidate of args.candidates) {
    if (exclude.has(candidate.userId)) continue;

    const eligible = memberHasTaskReviewAccess(
      {
        isSuperAdmin: candidate.isSuperAdmin,
        viewerOrgId: args.organisationId,
        hasTaskApprove: candidate.hasTaskApprove,
        approvalMemberGroupIds: candidate.approvalMemberGroupIds,
      },
      args.task,
      args.catalogue,
    );

    if (eligible) {
      recipients.push(candidate.userId);
    }
  }

  return recipients;
}

export async function loadTaskReviewNotificationCandidates(
  organisationId: string,
): Promise<TaskReviewNotificationCandidate[]> {
  const users = await User.find({
    organisations: organisationId,
    isActive: { $ne: false },
  })
    .select("_id isSuperAdmin organisationRoles")
    .lean();

  if (users.length === 0) {
    return [];
  }

  const userIds = users.map((user) => String(user._id));
  const groups = await Group.find({ organisation: organisationId })
    .select("_id approvalMembers")
    .lean();

  const approvalGroupIdsByUser = new Map<string, string[]>();
  for (const userId of userIds) {
    approvalGroupIdsByUser.set(userId, []);
  }
  for (const group of groups) {
    const groupId = String(group._id);
    for (const memberId of group.approvalMembers ?? []) {
      const key = String(memberId);
      const list = approvalGroupIdsByUser.get(key);
      if (list) {
        list.push(groupId);
      }
    }
  }

  const candidates: TaskReviewNotificationCandidate[] = [];
  for (const user of users) {
    const userId = String(user._id);
    const slice = getMembershipSliceForOrganisation(user, organisationId);
    const hasTaskApprove = await membershipHasPermission(
      organisationId,
      slice,
      Permission.TASK_APPROVE,
    );
    candidates.push({
      userId,
      isSuperAdmin: !!user.isSuperAdmin,
      hasTaskApprove,
      approvalMemberGroupIds: approvalGroupIdsByUser.get(userId) ?? [],
    });
  }

  return candidates;
}

export async function resolveTaskReviewNotificationRecipientIds(
  task: Pick<
    ITask,
    "organisation" | "visibility" | "privateAudiences" | "allowedGroups"
  >,
  options?: { excludeUserIds?: readonly string[] },
): Promise<string[]> {
  const organisationId = task.organisation ? String(task.organisation) : null;
  if (!organisationId) {
    return [];
  }

  const [catalogue, candidates] = await Promise.all([
    loadTaskReviewOrgCatalogue(organisationId),
    loadTaskReviewNotificationCandidates(organisationId),
  ]);

  return selectTaskReviewNotificationRecipientIds({
    organisationId,
    task: taskReviewEligibilityTaskFromDocument(task),
    catalogue,
    candidates,
    excludeUserIds: options?.excludeUserIds,
  });
}

export function shouldNotifyTaskReviewersForPendingTransition(
  previousStatus: string,
  nextStatus: string,
): boolean {
  return (
    nextStatus === TaskStatus.PENDING && previousStatus !== TaskStatus.PENDING
  );
}

export type TaskReviewNotifyFn = (
  opts: Parameters<typeof notify>[0],
) => ReturnType<typeof notify>;

export async function sendTaskReviewNotificationsToRecipients(
  task: Pick<ITask, "_id" | "title">,
  recipientIds: readonly string[],
  notifyFn: TaskReviewNotifyFn = notify,
): Promise<void> {
  if (recipientIds.length === 0) {
    return;
  }

  const link = `/jobs/${task._id}`;
  const title = "📋 Task pending approval";
  const message = `"${task.title}" was submitted and needs your review.`;

  await Promise.all(
    recipientIds.map((recipientId) =>
      notifyFn({
        recipientId,
        title,
        message,
        type: "info",
        link,
      }),
    ),
  );
}

export async function notifyEligibleTaskReviewers(
  task: Pick<ITask, "_id" | "title" | "createdBy" | "organisation" | "visibility" | "privateAudiences" | "allowedGroups">,
): Promise<void> {
  const recipientIds = await resolveTaskReviewNotificationRecipientIds(task, {
    excludeUserIds: [task.createdBy.toString()],
  });

  await sendTaskReviewNotificationsToRecipients(task, recipientIds);
}
