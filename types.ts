export const UserRole = {
  GLOBAL_ADMIN: "Global Admin",
  SCHOOL_ADMIN: "School Admin",
  TASK_MANAGER: "Task Manager",
  TASK_ADVERTISER: "Task Advertiser",
  APPLICANT: "Applicant",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const JobStatus = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobCategory = {
  TUTORING: "Tutoring",
  TEACHING_ASSISTANT: "Teaching Assistant",
  RESEARCH_LAB: "Research Lab",
  LIBRARY_SERVICES: "Library Services",
  CAMPUS_AMBASSADOR: "Campus Ambassador",
  SPORTS_COACHING: "Sports Coaching",
  ADMIN_SUPPORT: "Admin Support",
  EVENT_COORDINATION: "Event Coordination",
  IT_HELPDESK: "IT Helpdesk",
  CLEANING_MAINTENANCE: "Maintenance",
} as const;
export type JobCategory = (typeof JobCategory)[keyof typeof JobCategory];

export const RewardType = {
  PAID: "Paid",
  VOLUNTEER: "Volunteer",
  VOUCHER: "Voucher",
  VIA_POINTS: "VIA Points",
} as const;
export type RewardType = (typeof RewardType)[keyof typeof RewardType];

export const Visibility = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
  GLOBAL: "Global",
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const FileVisibility = {
  INTERNAL: "Internal",
  PUBLIC: "Public",
} as const;
export type FileVisibility =
  (typeof FileVisibility)[keyof typeof FileVisibility];

export interface Attachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string;
  description?: string;
  visibility: FileVisibility;
  url?: string; // Mock url
}

export interface Job {
  id: string;
  title: string;
  category: JobCategory;
  description: string;
  location: string;
  hoursRequired?: number;
  startDate?: string;
  endDate?: string;
  selectionCriteria?: string;
  requiredSkills?: string[];
  rewardType: string;
  rewardValue?: number;
  eligibility: string[]; // e.g., ['Students', 'Parents']
  visibility: Visibility;
  attachments: Attachment[];
  status: JobStatus;
  createdBy: string;
  createdAt: string;
  applicantsCount: number;
  hasApplied?: boolean;
  organisation?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  permissions?: string[];
}

export interface Skill {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Expert";
}

export interface ApplicantProfile extends User {
  about: string;
  skills: Skill[];
  experience: Job[]; // Completed tasks
}

export const Permission = {
  // Task/Job Permissions
  TASK_CREATE: "task:create",
  TASK_READ: "task:read",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",
  TASK_SUBMIT: "task:submit",
  TASK_APPROVE: "task:approve",
  TASK_PUBLISH: "task:publish",
  TASK_ARCHIVE: "task:archive",
  TASK_VIEW_INTERNAL: "task:view_internal",
  TASK_VIEW_PENDING: "task:view_pending",
  TASK_AUTO_PUBLISH: "task:auto_publish",

  // Application Permissions
  APPLICATION_CREATE: "application:create",
  APPLICATION_READ: "application:read",
  APPLICATION_READ_OWN: "application:read_own",
  APPLICATION_SHORTLIST: "application:shortlist",
  APPLICATION_APPROVE: "application:approve",
  APPLICATION_REJECT: "application:reject",
  APPLICATION_CONFIRM: "application:confirm",

  // User Management
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_IMPERSONATE: "user:impersonate",
  USER_MANAGE_ROLES: "user:manage_roles",

  // Organization Management
  ORG_CREATE: "org:create",
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_MANAGE_MEMBERS: "org:manage_members",

  // Dashboard & Analytics
  DASHBOARD_VIEW: "dashboard:view",
  ANALYTICS_VIEW: "analytics:view",

  // Reporting
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",
  REPORTS_CREATE: "reports:create",

  // Admin Permissions
  ADMIN_SETTINGS: "admin:settings",
  ADMIN_AUDIT_LOG: "admin:audit_log",
  ADMIN_MANAGE_TENANTS: "admin:manage_tenants",
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar: string;
  status:
    | "Pending"
    | "Reviewing"
    | "Shortlisted"
    | "Approved"
    | "Rejected"
    | "Offered"
    | "Accepted"
    | "Declined";
  appliedAt: string;
  coverLetter: string;
  availability: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: string[];
}

export interface PermissionInfo {
  id: string;
  name: string;
  description: string;
}
