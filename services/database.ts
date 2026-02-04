import {
  Job,
  User,
  UserRole,
  Application,
  ApplicantProfile,
  JobStatus,
  JobCategory,
  RewardType,
  Visibility,
} from "../types";
import { api, ApiError } from "./api";

// Helper to map Backend Task to Frontend Job
const mapTaskToJob = (task: any): Job => {
  return {
    id: task._id,
    title: task.title,
    category:
      typeof task.category === "object"
        ? task.category.name
        : task.category || "General",
    description: task.description,
    location: task.location,
    hoursRequired: task.hoursRequired,
    startDate: task.createdAt ? task.createdAt.split("T")[0] : undefined,
    endDate: task.updatedAt ? task.updatedAt.split("T")[0] : undefined,
    selectionCriteria: task.eligibility?.join(", ") || "",
    rewardType: mapRewardType(task.rewardType),
    rewardValue: task.rewardValue,
    eligibility: task.eligibility || [],
    visibility:
      task.visibility === "Public" ? Visibility.GLOBAL : Visibility.INTERNAL,
    attachments: [], // Handled separately or extended later
    status: mapStatus(task.status),
    createdBy:
      typeof task.createdBy === "object" ? task.createdBy.name : "Unknown",
    createdAt: task.createdAt,
    applicantsCount: task.applicantsCount || 0,
  };
};

const mapRewardType = (type: string): RewardType => {
  switch (type) {
    case "Paid":
      return RewardType.PAID;
    case "Points":
      return RewardType.VIA_POINTS;
    case "Volunteer":
      return RewardType.VOLUNTEER;
    case "Voucher":
      return RewardType.VOUCHER;
    default:
      return RewardType.VOLUNTEER;
  }
};

const mapStatus = (status: string): JobStatus => {
  switch (status) {
    case "Draft":
      return JobStatus.DRAFT;
    case "Pending":
      return JobStatus.PENDING;
    case "Published":
      return JobStatus.PUBLISHED;
    case "Closed":
      return JobStatus.CLOSED;
    case "Archived":
      return JobStatus.ARCHIVED;
    default:
      return JobStatus.DRAFT;
  }
};

const mapAppToFrontend = (app: any): Application => {
  return {
    id: app._id,
    jobId: app.task?._id || app.task,
    jobTitle: app.task?.title || "Task",
    userId: app.applicant?._id || app.applicant,
    applicantName: app.applicant?.name || "Unknown",
    applicantEmail: app.applicant?.email || "",
    applicantAvatar: app.applicant?.avatar || "https://i.pravatar.cc/150",
    status: app.status as any,
    appliedAt: app.createdAt,
    coverLetter: app.coverLetter,
    availability: app.availability,
  };
};

class DatabaseService {
  // --- Auth & User ---

  async login(email: string, pass: string) {
    return await api.login(email, pass);
  }

  async signup(userData: any) {
    return await api.signup(userData);
  }

  async forgotPassword(email: string) {
    return await api.request<any>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return await api.request<any>(`/auth/reset-password/${token}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  async logout(): Promise<void> {
    await api.logout();
  }

  async getCurrentUser(): Promise<User | null> {
    const stored = localStorage.getItem("user_data");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        return {
          ...user,
          skills: user.skills || [],
          about: user.about || "",
          avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async updateUserProfile(profile: any): Promise<User> {
    const response = await api.request<any>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    localStorage.setItem("user_data", JSON.stringify(response.user));
    return response.user;
  }

  async updateCurrentUserRole(role: UserRole): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("No user found");
    // For now, local switch for demo/admin purposes
    user.role = role;
    localStorage.setItem("user_data", JSON.stringify(user));
    return user;
  }

  // Admin Impersonation
  async impersonateUser(userId: string): Promise<User> {
    const response = await api.request<any>(`/auth/impersonate/${userId}`, {
      method: "POST",
    });
    localStorage.setItem("user_data", JSON.stringify(response.user));
    localStorage.setItem("auth_token", response.token);
    return response.user;
  }

  // --- Jobs (Tasks) ---

  async getJobs(): Promise<Job[]> {
    const tasks = await api.getTasks();
    return tasks.map(mapTaskToJob);
  }

  async getJob(id: string): Promise<Job | undefined> {
    const task = await api.getTask(id);
    return mapTaskToJob(task);
  }

  async addJob(job: any): Promise<any> {
    // Map to backend field names
    const backendData = {
      ...job,
      estimatedHours: job.hoursRequired,
      publishTo: job.eligibility,
      scope: job.visibility === Visibility.GLOBAL ? "global" : "internal",
    };
    return await api.createTask(backendData);
  }

  async updateJob(id: string, data: any): Promise<any> {
    return await api.request<any>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async approveJob(
    id: string,
    status: "approve" | "decline" = "approve",
  ): Promise<any> {
    return await api.approveTask(id, status);
  }

  // --- Applications ---

  async getApplications(filters: any = {}): Promise<Application[]> {
    const apps = await api.getApplications(filters);
    return apps.map(mapAppToFrontend);
  }

  async getApplicationsForJob(jobId: string): Promise<Application[]> {
    return this.getApplications({ taskId: jobId });
  }

  async getApplication(id: string): Promise<Application | undefined> {
    try {
      const app = await api.getApplication(id);
      return mapAppToFrontend(app);
    } catch (err) {
      console.warn("Failed to get application", err);
      return undefined;
    }
  }

  async applyForJob(applicationData: any): Promise<any> {
    return await api.applyForTask(applicationData);
  }

  async updateApplicationStatus(appId: string, status: string): Promise<any> {
    return await api.updateApplicationStatus(appId, status);
  }

  // --- Notifications ---
  async getNotifications(): Promise<any[]> {
    return await api.getNotifications();
  }

  async markNotificationRead(id: string): Promise<any> {
    return await api.markNotificationRead(id);
  }

  // --- Organizations ---
  async getOrganizations(): Promise<any[]> {
    try {
      const orgs = await api.getOrganizations();
      return orgs.map((org: any) => ({
        id: org._id,
        name: org.name,
        slug: org.slug,
        type: org.type,
      }));
    } catch (err) {
      console.warn("Failed to fetch organizations", err);
      return [];
    }
  }

  // --- Reward Types ---
  async getRewardTypes(): Promise<any[]> {
    try {
      return await api.getRewardTypes();
    } catch (err) {
      console.warn("Failed to fetch reward types", err);
      return [];
    }
  }

  // --- Task Categories ---
  async getTaskCategories(): Promise<any[]> {
    try {
      return await api.getTaskCategories();
    } catch (err) {
      console.warn("Failed to fetch task categories", err);
      return [];
    }
  }
}

export const db = new DatabaseService();
