export enum UserRole {
  ADMIN = "Admin",
  OWNER = "Owner",
  APPROVER = "Approver",
  MEMBER = "Member",
  INDEPENDENT = "Independent",
}

export enum JobStatus {
  DRAFT = "Draft",
  PENDING = "Pending",
  APPROVED = "Approved",
  PUBLISHED = "Published",
  CLOSED = "Closed",
  ARCHIVED = "Archived",
}

export enum JobCategory {
  TUTORING = "Tutoring",
  TEACHING_ASSISTANT = "Teaching Assistant",
  RESEARCH_LAB = "Research Lab",
  LIBRARY_SERVICES = "Library Services",
  CAMPUS_AMBASSADOR = "Campus Ambassador",
  SPORTS_COACHING = "Sports Coaching",
  ADMIN_SUPPORT = "Admin Support",
  EVENT_COORDINATION = "Event Coordination",
  IT_HELPDESK = "IT Helpdesk",
  CLEANING_MAINTENANCE = "Maintenance",
}

export enum RewardType {
  PAID = "Paid",
  VOLUNTEER = "Volunteer",
  VOUCHER = "Voucher",
  VIA_POINTS = "VIA Points",
}

export enum Visibility {
  INTERNAL = "Internal",
  EXTERNAL = "External",
  GLOBAL = "Global",
}

export enum FileVisibility {
  INTERNAL = "Internal",
  PUBLIC = "Public",
}

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
  rewardType: RewardType;
  rewardValue?: number;
  eligibility: string[]; // e.g., ['Students', 'Parents']
  visibility: Visibility;
  attachments: Attachment[];
  status: JobStatus;
  createdBy: string;
  createdAt: string;
  applicantsCount: number;
  hasApplied?: boolean; // Whether current user has applied
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
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

export interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar: string;
  status: "Pending" | "Reviewing" | "Approved" | "Rejected";
  appliedAt: string;
  coverLetter: string;
  availability: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: string[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}
