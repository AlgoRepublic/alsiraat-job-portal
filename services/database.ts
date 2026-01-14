import { Job, User, UserRole, Application, ApplicantProfile, JobStatus, JobCategory, RewardType, Visibility } from '../types';
import { api, ApiError } from './api';
import { MOCK_JOBS, MOCK_APPLICATIONS, INITIAL_USER } from './mockData';

// Helper to map Backend Task to Frontend Job
const mapTaskToJob = (task: any): Job => {
    return {
        id: task._id,
        title: task.title,
        category: task.category?.name || 'General', 
        description: task.description,
        location: task.location,
        hoursRequired: task.estimatedHours,
        startDate: task.startDate ? task.startDate.split('T')[0] : undefined,
        endDate: task.closeDate ? task.closeDate.split('T')[0] : undefined,
        selectionCriteria: task.keySelectionCriteria,
        rewardType: mapRewardType(task.rewardType),
        rewardValue: task.rewardValue,
        eligibility: task.publishTo || [],
        visibility: task.scope === 'global' ? Visibility.GLOBAL : (task.scope === 'external' ? Visibility.EXTERNAL : Visibility.INTERNAL),
        attachments: task.attachments?.map((a: any) => ({
            id: a._id,
            name: a.originalName || 'Attachment',
            size: a.size || 0,
            type: a.mimeType,
            url: a.path 
        })) || [],
        status: mapStatus(task.status),
        createdBy: task.createdBy?.name || 'Unknown',
        createdAt: task.createdAt,
        applicantsCount: 0 
    };
};

const mapRewardType = (type: string): RewardType => {
    switch (type) {
        case 'paid_lumpsum': return RewardType.PAID;
        case 'paid_per_hour': return RewardType.PAID;
        case 'via_hours': return RewardType.VIA_POINTS;
        case 'volunteer': return RewardType.VOLUNTEER;
        case 'voucher': return RewardType.VOUCHER;
        default: return RewardType.VOLUNTEER;
    }
};

const mapRewardTypeToBackend = (type: RewardType): string => {
    switch (type) {
        case RewardType.PAID: return 'paid_lumpsum';
        case RewardType.VIA_POINTS: return 'via_hours';
        case RewardType.VOLUNTEER: return 'volunteer';
        case RewardType.VOUCHER: return 'voucher';
        default: return 'volunteer';
    }
};

const mapStatus = (status: string): JobStatus => {
    switch (status) {
        case 'draft': return JobStatus.DRAFT;
        case 'pending_review': return JobStatus.PENDING;
        case 'published': return JobStatus.PUBLISHED;
        case 'completed': return JobStatus.CLOSED; 
        case 'archived': return JobStatus.ARCHIVED;
        default: return JobStatus.DRAFT;
    }
};

const mapStatusToBackend = (status: JobStatus): string => {
    switch (status) {
        case JobStatus.DRAFT: return 'draft';
        case JobStatus.PENDING: return 'pending_review';
        case JobStatus.PUBLISHED: return 'published';
        case JobStatus.CLOSED: return 'completed';
        case JobStatus.ARCHIVED: return 'archived';
        default: return 'draft';
    }
};

const mapAppToFrontend = (app: any): Application => {
    return {
        id: app._id,
        jobId: app.task?._id || app.task,
        userId: app.applicant?._id || app.applicant,
        applicantName: app.applicant?.name || 'Unknown',
        applicantEmail: app.applicant?.email || '',
        applicantAvatar: app.applicant?.avatar || "https://i.pravatar.cc/150",
        status: mapAppStatus(app.status),
        appliedAt: app.createdAt,
        coverLetter: app.coverLetter,
        availability: app.availability
    };
};

const mapAppStatus = (status: string): any => {
    if (status === 'shortlisted' || status === 'offer_sent' || status === 'offer_accepted') return 'Approved';
    if (status === 'rejected' || status === 'offer_declined' || status === 'withdrawn') return 'Rejected';
    return 'Pending';
};

class DatabaseService {
  // In-memory fallback storage
  private _localJobs: Job[] = [...MOCK_JOBS];
  private _localApps: Application[] = [...MOCK_APPLICATIONS];

  // --- Auth & User ---

  async login(email: string, pass: string) {
      try {
          return await api.login(email, pass);
      } catch (e: any) {
          // If the error is a Client Error (400 Bad Request, 401 Unauthorized, etc.)
          // we should re-throw it so the UI displays the error message.
          // We only fallback to mock if the API is unreachable or returns 500s.
          if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
              throw e;
          }

          console.warn("API Login failed/unreachable. Logging in as Mock User.", e);
          // Fallback login
          const mockUser = { ...INITIAL_USER, email };
          localStorage.setItem('auth_token', 'mock_token_123');
          localStorage.setItem('user_data', JSON.stringify(mockUser));
          return { status: 'success', data: { token: 'mock_token_123', user: mockUser, profiles: [mockUser] } };
      }
  }

  async loginWithEntra(): Promise<void> {
      try {
          return await api.loginWithEntra();
      } catch (e) {
          // Fallback
          localStorage.setItem('auth_token', 'mock_sso_token');
          localStorage.setItem('user_data', JSON.stringify(INITIAL_USER));
          return;
      }
  }

  async getCurrentUser(): Promise<ApplicantProfile | null> {
      const stored = localStorage.getItem('user_data');
      if (stored) {
          try {
            const profile = JSON.parse(stored);
            return {
                ...INITIAL_USER,
                id: profile.id || profile._id || 'u1',
                name: profile.name,
                email: profile.email,
                avatar: profile.avatar || INITIAL_USER.avatar,
                role: profile.role || UserRole.MANAGER 
            };
          } catch(e) {
            return null;
          }
      }
      return null;
  }

  async updateCurrentUserRole(role: UserRole): Promise<User> {
      const user = await this.getCurrentUser();
      if (!user) return INITIAL_USER;
      user.role = role;
      localStorage.setItem('user_data', JSON.stringify(user));
      return user; 
  }

  async updateUserProfile(updatedProfile: ApplicantProfile): Promise<void> {
      localStorage.setItem('user_data', JSON.stringify(updatedProfile));
  }

  // --- Jobs (Tasks) ---

  async getJobs(): Promise<Job[]> {
      try {
          const tasks = await api.getTasks({ perPage: 100 });
          return tasks.map(mapTaskToJob);
      } catch (e) {
          console.warn("API unreachable, returning mock jobs");
          return this._localJobs;
      }
  }

  async getJob(id: string): Promise<Job | undefined> {
      try {
          const task = await api.getTask(id);
          return mapTaskToJob(task);
      } catch (e) {
          return this._localJobs.find(j => j.id === id);
      }
  }

  async addJob(job: Job): Promise<void> {
      try {
          const formData = new FormData();
          formData.append('title', job.title);
          formData.append('description', job.description);
          formData.append('location', job.location);
          formData.append('estimatedHours', String(job.hoursRequired));
          if (job.startDate) formData.append('startDate', new Date(job.startDate).toISOString());
          if (job.endDate) formData.append('closeDate', new Date(job.endDate).toISOString());
          formData.append('keySelectionCriteria', job.selectionCriteria || '');
          formData.append('rewardType', mapRewardTypeToBackend(job.rewardType));
          if (job.rewardValue) formData.append('rewardValue', String(job.rewardValue));
          
          job.eligibility.forEach((item, index) => {
              formData.append(`publishTo[${index}]`, item.toLowerCase());
          });

          // Attempt to fetch categories to map name to ID
          try {
              const categories = await api.getCategories();
              const match = categories.find(c => c.name === job.category);
              if (match) {
                  formData.append('category', match._id);
              } else if (categories.length > 0) {
                   formData.append('category', categories[0]._id);
              }
          } catch (e) {
               // ignore category fetch error
          }

          formData.append('status', mapStatusToBackend(job.status));
          await api.createTask(formData);
      } catch (e) {
          console.warn("API unreachable, adding to local mock jobs");
          this._localJobs.unshift(job);
      }
  }

  async updateJob(updatedJob: Job): Promise<void> {
      try {
          const formData = new FormData();
          formData.append('title', updatedJob.title);
          await api.updateTask(updatedJob.id, formData);
      } catch (e) {
          const index = this._localJobs.findIndex(j => j.id === updatedJob.id);
          if (index !== -1) this._localJobs[index] = updatedJob;
      }
  }

  async updateJobStatus(id: string, status: JobStatus): Promise<void> {
      try {
          const formData = new FormData();
          formData.append('status', mapStatusToBackend(status));
          await api.updateTask(id, formData);
      } catch (e) {
          const job = this._localJobs.find(j => j.id === id);
          if (job) job.status = status;
      }
  }

  // --- Applications ---

  async getApplications(): Promise<Application[]> {
      try {
          const apps = await api.getApplications({ perPage: 100 });
          return apps.map(mapAppToFrontend);
      } catch (e) {
          console.warn("API unreachable, returning mock applications");
          return this._localApps;
      }
  }

  async getApplicationsForJob(jobId: string): Promise<Application[]> {
      try {
          const apps = await api.getApplications({ task: jobId });
          return apps.map(mapAppToFrontend);
      } catch (e) {
          return this._localApps.filter(a => a.jobId === jobId);
      }
  }

  async getApplication(appId: string): Promise<Application | undefined> {
      try {
          const app = await api.getApplication(appId);
          return mapAppToFrontend(app);
      } catch (e) {
          return this._localApps.find(a => a.id === appId);
      }
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
       try {
          const apps = await api.getApplications({ applicant: userId });
          return apps.map(mapAppToFrontend);
      } catch (e) {
          return this._localApps.filter(a => a.userId === userId);
      }
  }

  async applyForJob(application: Application): Promise<void> {
      try {
          const formData = new FormData();
          formData.append('task', application.jobId);
          formData.append('coverLetter', application.coverLetter);
          formData.append('availability', application.availability);
          await api.createApplication(formData);
      } catch (e) {
          this._localApps.push(application);
          // Update job applicant count locally
          const job = this._localJobs.find(j => j.id === application.jobId);
          if (job) job.applicantsCount = (job.applicantsCount || 0) + 1;
      }
  }

  async updateApplicationStatus(appId: string, status: 'Approved' | 'Rejected'): Promise<void> {
      try {
          const formData = new FormData();
          const backendStatus = status === 'Approved' ? 'shortlisted' : 'rejected';
          formData.append('status', backendStatus);
          await api.updateApplication(appId, formData);
      } catch (e) {
          const app = this._localApps.find(a => a.id === appId);
          if (app) app.status = status;
      }
  }

  async hasUserApplied(userId: string, jobId: string): Promise<boolean> {
      const apps = await this.getApplicationsForJob(jobId);
      return apps.some(a => a.userId === userId);
  }
}

export const db = new DatabaseService();
