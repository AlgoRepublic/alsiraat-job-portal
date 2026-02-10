import {
  Job,
  JobCategory,
  JobStatus,
  RewardType,
  Visibility,
  FileVisibility,
  Application,
  UserRole,
  ApplicantProfile,
} from "../types";

export const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Annual Science Fair Coordinator",
    category: JobCategory.EVENT_COORDINATION,
    description:
      "We are looking for an organized and enthusiastic individual to lead the organisation of the 2024 Science Fair. \n\nResponsibilities include:\n- Coordinating with science teachers\n- Managing student registrations\n- Setting up the venue\n- Arranging judges and prizes\n\nThis is a great opportunity to get involved with the school community and support STEM education.",
    location: "Main Hall",
    hoursRequired: 15,
    rewardType: RewardType.PAID,
    rewardValue: 500,
    eligibility: ["Staff", "Parents"],
    visibility: Visibility.INTERNAL,
    attachments: [
      {
        id: "a1",
        name: "Science_Fair_Guidelines.pdf",
        size: 2400000,
        type: "application/pdf",
        visibility: FileVisibility.PUBLIC,
        url: "#",
      },
    ],
    status: JobStatus.PUBLISHED,
    createdBy: "Admin",
    createdAt: "2024-05-20",
    applicantsCount: 5,
  },
  {
    id: "2",
    title: "Math Teacher (Grade 5)",
    category: JobCategory.TEACHING_ASSISTANT,
    description:
      "We require a Math teacher for 5th class. It will be a contract base job.",
    location: "Melbourne Address 1",
    hoursRequired: 4,
    rewardType: RewardType.PAID,
    rewardValue: 300,
    startDate: "2025-11-25",
    endDate: "2026-05-30",
    eligibility: ["Community"],
    visibility: Visibility.GLOBAL,
    attachments: [],
    status: JobStatus.PENDING, // Pending for Manager to approve
    createdBy: "Nasir",
    createdAt: "2024-05-22",
    applicantsCount: 2,
  },
  {
    id: "3",
    title: "Garden Maintenance",
    category: JobCategory.CLEANING_MAINTENANCE,
    description:
      "Help clear the community garden beds and prepare them for spring planting. Tools will be provided.",
    location: "North Garden",
    hoursRequired: 4,
    rewardType: RewardType.VIA_POINTS,
    rewardValue: 20,
    eligibility: ["Students", "Parents"],
    visibility: Visibility.INTERNAL,
    attachments: [],
    status: JobStatus.PUBLISHED,
    createdBy: "Grounds Keeper",
    createdAt: "2024-05-23",
    applicantsCount: 8,
  },
  {
    id: "4",
    title: "Sports League Helper",
    category: JobCategory.EVENT_COORDINATION,
    description: "Assist with the weekend sports league.",
    location: "Oval",
    hoursRequired: 6,
    rewardType: RewardType.VOLUNTEER,
    eligibility: ["Students"],
    visibility: Visibility.EXTERNAL,
    attachments: [],
    status: JobStatus.APPROVED,
    createdBy: "Ali Raza",
    createdAt: "2024-06-01",
    applicantsCount: 0,
  },
];

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: "app1",
    jobId: "2", // Math Teacher
    userId: "u2",
    applicantName: "Nasir Ali",
    applicantEmail: "nasir12@gmail.com",
    applicantAvatar: "https://i.pravatar.cc/150?u=nasir",
    status: "Pending",
    appliedAt: "2024-05-24T10:00:00Z",
    coverLetter:
      "I have expertise and experience as a Math teacher for 5 years. I am very keen to join this role.",
    availability:
      "As per your job you required a teacher for 4 hours. But I am available for 3 hours.",
  },
  {
    id: "app2",
    jobId: "2",
    userId: "u3",
    applicantName: "Akbar Khan",
    applicantEmail: "akbar@gmail.com",
    applicantAvatar: "https://i.pravatar.cc/150?u=akbar",
    status: "Pending",
    appliedAt: "2024-05-25T09:30:00Z",
    coverLetter: "I am a certified tutor.",
    availability: "Weekends",
  },
];

export const INITIAL_USER: ApplicantProfile = {
  id: "u1",
  name: "Alex Johnson",
  role: UserRole.TASK_MANAGER, // Defaulting to Manager for demo purposes to show flows
  avatar: "https://i.pravatar.cc/150?u=alex",
  email: "alex@hayati.edu",
  about:
    "I am an enthusiastic staff member looking to connect students with opportunities.",
  skills: [],
  experience: [],
};
