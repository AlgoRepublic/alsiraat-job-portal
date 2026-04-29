// import { UserRole } from "../models/User.js"; // Removed import to avoid dependency issues in testing

interface TaskModel {
  findById(id: string): Promise<any>;
  find(query: any): any;
}

interface ApplicationQueryDeps {
  TaskModel: TaskModel;
}

// Define the shape of UserRole object we expect
interface UserRoleEnum {
  GLOBAL_ADMIN: string;
  [key: string]: string;
}

export const buildApplicationQuery = async (
  user: any,
  taskId: string | undefined,
  permissions: { hasFullAccess: boolean; hasOwnAccess: boolean },
  deps: ApplicationQueryDeps,
  UserRole: UserRoleEnum, // Inject UserRole
): Promise<any> => {
  const { hasFullAccess, hasOwnAccess } = permissions;
  let query: any = {};

  if (taskId) {
    query.task = taskId;

    // If user only has read_own permission, ensure they can only see their own applications
    if (!hasFullAccess && hasOwnAccess) {
      query.applicant = user._id;
    }
    // If user has full access, check if they can view this task's applications
    else if (hasFullAccess) {
      const task = await deps.TaskModel.findById(taskId);
      const isGlobalAdmin = (user.orgRoles || []).some(
        (r: string) => r.toLowerCase() === UserRole.GLOBAL_ADMIN.toLowerCase(),
      );
      if (task && !isGlobalAdmin) {
        // Check if user is from the same org or is the task creator
        if (
          task.organisation?.toString() !== user.orgId?.toString() &&
          task.createdBy?.toString() !== user._id.toString()
        ) {
          throw new Error(
            "You don't have permission to view these applications",
          ); // Or handle this differently
        }
      }
    }
  } else {
    // No specific task - filter based on permissions
    const isGlobalAdmin = (user.orgRoles || []).some(
      (r: string) => r.toLowerCase() === UserRole.GLOBAL_ADMIN.toLowerCase(),
    );
    if (isGlobalAdmin) {
      // Admin sees all
      query = {};
    } else if (hasFullAccess) {
      // Users with APPLICATION_READ see applications for their org's tasks
      if (user.orgId) {
        const tasks = await deps.TaskModel.find({
          organisation: user.orgId,
        }).select("_id");
        query.task = { $in: tasks.map((t: any) => t._id) };
      } else {
        // Independent users with full access see applications for their own tasks
        const tasks = await deps.TaskModel.find({
          createdBy: user._id,
        }).select("_id");
        query.task = { $in: tasks.map((t: any) => t._id) };
      }
    } else if (hasOwnAccess) {
      // Users with only APPLICATION_READ_OWN see only their own applications
      query.applicant = user._id;
    }
  }

  return query;
};
