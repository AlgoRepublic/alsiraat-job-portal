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
  FileVisibility,
} from "../types";
import { api, ApiError, API_BASE_URL } from "./api";

// Helper to map Backend Task to Frontend Job

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
    startDate: task.startDate
      ? task.startDate.split("T")[0]
      : task.createdAt
        ? task.createdAt.split("T")[0]
        : undefined,
    endDate: task.endDate ? task.endDate.split("T")[0] : undefined,
    selectionCriteria: task.selectionCriteria || "",
    requiredSkills: task.requiredSkills || [],
    rewardType: task.rewardType,
    rewardValue: task.rewardValue,
    eligibility: task.eligibility || [],
    visibility:
      task.visibility === "Public" || task.visibility === "Global"
        ? Visibility.GLOBAL
        : Visibility.INTERNAL,
    attachments: Array.isArray(task.attachments)
      ? task.attachments.map((a: any) => ({
          id: a.filename,
          name: a.filename,
          size: a.size,
          type: a.mimeType,
          visibility: FileVisibility.INTERNAL,
          url: a.url
            ? `${API_BASE_URL.replace(/\/api$/, "")}${a.url}`
            : undefined,
        }))
      : [],
    status: mapStatus(task.status),
    rejectionReason: task.rejectionReason,
    createdBy:
      typeof task.createdBy === "object" ? task.createdBy.name : "Unknown",
    createdAt: task.createdAt,
    applicantsCount: task.applicantsCount || 0,
    hasApplied: task.hasApplied || false,
    organisation:
      typeof task.organisation === "object"
        ? task.organisation?._id
        : task.organisation,
  };
};

const mapStatus = (status: string): JobStatus => {
  switch (status) {
    case "Draft":
      return JobStatus.DRAFT;
    case "Pending":
      return JobStatus.PENDING;
    case "Changes Requested":
      return JobStatus.CHANGES_REQUESTED;
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
    applicantAvatar: app.applicant?.avatar || undefined,
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

  /** Complete SSO login after redirect: store token, fetch user, store user_data. */
  async completeSSOLogin(token: string): Promise<User> {
    api.setToken(token);
    const { user } = await api.getMe();
    localStorage.setItem("user_data", JSON.stringify(user));
    return user as User;
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
          avatar: user.avatar || undefined,
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

  async uploadResume(
    file: File,
  ): Promise<{ resumeUrl: string; resumeOriginalName: string }> {
    const token = localStorage.getItem("auth_token");
    const formData = new FormData();
    formData.append("resume", file);

    const response = await fetch(`${API_BASE_URL}/auth/upload-resume`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Failed to upload resume");
    }

    const data = await response.json();
    // Persist the new resume info into local user_data
    const stored = localStorage.getItem("user_data");
    if (stored) {
      const user = JSON.parse(stored);
      user.resumeUrl = data.resumeUrl;
      user.resumeOriginalName = data.resumeOriginalName;
      localStorage.setItem("user_data", JSON.stringify(user));
    }
    return data;
  }

  async removeResume(): Promise<void> {
    await api.request<any>("/auth/resume", { method: "DELETE" });
    const stored = localStorage.getItem("user_data");
    if (stored) {
      const user = JSON.parse(stored);
      delete user.resumeUrl;
      delete user.resumeOriginalName;
      localStorage.setItem("user_data", JSON.stringify(user));
    }
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
    status: "approve" | "decline" | "archive" = "approve",
    rejectionReason?: string,
  ): Promise<any> {
    return await api.approveTask(id, status, rejectionReason);
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

  async updateApplicationStatus(id: string, status: string): Promise<any> {
    return api.put(`/applications/${id}/status`, { status });
  }

  async confirmOffer(id: string): Promise<any> {
    return api.put(`/applications/${id}/confirm`, {});
  }

  async declineOffer(id: string): Promise<any> {
    return api.put(`/applications/${id}/decline`, {});
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
      console.warn("Failed to fetch organisations", err);
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

  async getUsers(search?: string, role?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (role) params.append("role", role);
    return api.get(`/users?${params.toString()}`);
  }

  async getUser(id: string): Promise<any> {
    return api.get(`/users/${id}`);
  }

  async updateUserRole(id: string, roleId: string): Promise<any> {
    return api.patch(`/users/${id}/role`, { roleId });
  }

  async updateUser(
    id: string,
    data: { name?: string; email?: string; role?: string },
  ): Promise<any> {
    return api.put(`/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<any> {
    return api.delete(`/users/${id}`);
  }

  async getRoles(): Promise<any[]> {
    return api.getRoles();
  }

  // --- Groups ---
  async getGroupsPublic(): Promise<any[]> {
    try {
      return await api.getGroupsPublic();
    } catch (err) {
      console.warn("Failed to fetch groups", err);
      return [];
    }
  }

  async getGroups(search?: string): Promise<any[]> {
    return api.getGroups(search);
  }

  async getGroup(id: string): Promise<any> {
    return api.getGroup(id);
  }

  async createGroup(data: {
    name: string;
    description?: string;
    color?: string;
    members?: string[];
  }): Promise<any> {
    return api.createGroup(data);
  }

  async updateGroup(id: string, data: any): Promise<any> {
    return api.updateGroup(id, data);
  }

  async deleteGroup(id: string): Promise<any> {
    return api.deleteGroup(id);
  }

  async addGroupMembers(groupId: string, userIds: string[]): Promise<any> {
    return api.addGroupMembers(groupId, userIds);
  }

  async removeGroupMember(groupId: string, userId: string): Promise<any> {
    return api.removeGroupMember(groupId, userId);
  }
}

export const db = new DatabaseService();
