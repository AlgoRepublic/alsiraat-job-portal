
import { Job, User, UserRole, Application, ApplicantProfile, JobStatus } from '../types';
import { MOCK_JOBS, MOCK_APPLICATIONS, INITIAL_USER } from './mockData';

// Simulate network delay
const delay = <T>(ms: number, value: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(value), ms));
};

class DatabaseService {
  private jobsKey = 'hayati_jobs';
  private usersKey = 'hayati_users';
  private applicationsKey = 'hayati_applications';

  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(this.jobsKey)) {
      localStorage.setItem(this.jobsKey, JSON.stringify(MOCK_JOBS));
    }
    if (!localStorage.getItem(this.usersKey)) {
      const users = [INITIAL_USER];
      localStorage.setItem(this.usersKey, JSON.stringify(users));
    }
    if (!localStorage.getItem(this.applicationsKey)) {
      localStorage.setItem(this.applicationsKey, JSON.stringify(MOCK_APPLICATIONS));
    }
  }

  // --- Helper Methods (Sync for internal use) ---
  private _getUsers(): ApplicantProfile[] {
    return JSON.parse(localStorage.getItem(this.usersKey) || '[]');
  }
  private _saveUsers(users: ApplicantProfile[]) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }
  private _getJobs(): Job[] {
    return JSON.parse(localStorage.getItem(this.jobsKey) || '[]');
  }
  private _saveJobs(jobs: Job[]) {
    localStorage.setItem(this.jobsKey, JSON.stringify(jobs));
  }
  private _getApplications(): Application[] {
      return JSON.parse(localStorage.getItem(this.applicationsKey) || '[]');
  }
  private _saveApplications(apps: Application[]) {
      localStorage.setItem(this.applicationsKey, JSON.stringify(apps));
  }


  // --- Async API Methods ---

  async getCurrentUser(): Promise<ApplicantProfile> {
    const users = this._getUsers();
    return delay(300, users[0] || INITIAL_USER);
  }

  async updateCurrentUserRole(role: UserRole): Promise<User> {
    const users = this._getUsers();
    if (users.length > 0) {
      users[0].role = role;
      this._saveUsers(users);
      return delay(200, users[0]);
    }
    return delay(200, INITIAL_USER);
  }

  async updateUserProfile(updatedProfile: ApplicantProfile): Promise<void> {
    const users = this._getUsers();
    const index = users.findIndex(u => u.id === updatedProfile.id);
    if (index !== -1) {
        users[index] = updatedProfile;
        this._saveUsers(users);
    }
    return delay(500, undefined);
  }

  // --- Jobs ---

  async getJobs(): Promise<Job[]> {
    return delay(500, this._getJobs());
  }

  async getJob(id: string): Promise<Job | undefined> {
    return delay(300, this._getJobs().find(j => j.id === id));
  }

  async addJob(job: Job): Promise<void> {
    const jobs = this._getJobs();
    jobs.unshift(job); // Add to top
    this._saveJobs(jobs);
    return delay(800, undefined);
  }

  async updateJob(updatedJob: Job): Promise<void> {
      const jobs = this._getJobs();
      const index = jobs.findIndex(j => j.id === updatedJob.id);
      if (index !== -1) {
          jobs[index] = updatedJob;
          this._saveJobs(jobs);
      }
      return delay(500, undefined);
  }

  async updateJobStatus(id: string, status: JobStatus): Promise<void> {
      const jobs = this._getJobs();
      const index = jobs.findIndex(j => j.id === id);
      if (index !== -1) {
          jobs[index].status = status;
          this._saveJobs(jobs);
      }
      return delay(300, undefined);
  }

  // --- Applications ---

  async getApplications(): Promise<Application[]> {
      return delay(400, this._getApplications());
  }

  async getApplicationsForJob(jobId: string): Promise<Application[]> {
      return delay(400, this._getApplications().filter(a => a.jobId === jobId));
  }

  async getApplication(appId: string): Promise<Application | undefined> {
      return delay(200, this._getApplications().find(a => a.id === appId));
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
      return delay(400, this._getApplications().filter(a => a.userId === userId));
  }

  async applyForJob(application: Application): Promise<void> {
      const apps = this._getApplications();
      apps.push(application);
      this._saveApplications(apps);

      // Update job applicant count
      const jobs = this._getJobs();
      const jobIndex = jobs.findIndex(j => j.id === application.jobId);
      if (jobIndex !== -1) {
          jobs[jobIndex].applicantsCount = (jobs[jobIndex].applicantsCount || 0) + 1;
          this._saveJobs(jobs);
      }
      return delay(1000, undefined);
  }

  async updateApplicationStatus(appId: string, status: 'Approved' | 'Rejected'): Promise<void> {
      const apps = this._getApplications();
      const index = apps.findIndex(a => a.id === appId);
      if (index !== -1) {
          apps[index].status = status;
          this._saveApplications(apps);
      }
      return delay(300, undefined);
  }

  async hasUserApplied(userId: string, jobId: string): Promise<boolean> {
      const applied = this._getApplications().some(a => a.userId === userId && a.jobId === jobId);
      return delay(200, applied);
  }
}

export const db = new DatabaseService();
