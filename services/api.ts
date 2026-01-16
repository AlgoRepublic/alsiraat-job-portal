import { Job, Application, ApplicantProfile, UserRole, JobStatus } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://tasks.alsiraat.vic.edu.au/api/v1';

export class ApiError extends Error {
    status: number;
    data?: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

interface AuthResponse {
    status: string;
    data: {
        token: string;
        user: any;
        profiles: any[];
    };
}

interface ApiResponse<T> {
    status: string;
    data: T;
    meta?: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    }
}

class ApiService {
  private token: string | null = localStorage.getItem('auth_token');
  private profileId: string | null = localStorage.getItem('auth_profile_id');

  private getHeaders(isFormData = false): HeadersInit {
    const headers: HeadersInit = {};
    if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.profileId) {
        headers['x-profile-id'] = this.profileId;
    }
    // Content-Type is automatically set by browser when body is FormData
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
        headers['Accept'] = 'application/json';
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Check if body is FormData to toggle headers
    const isFormData = options.body instanceof FormData;
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(isFormData),
          ...options.headers
        }
      });

      // Special handling for Login endpoint - do not redirect on 401/400
      const isLogin = endpoint.includes('/auth/login');

      if (response.status === 401 && !isLogin) {
        this.logout();
        window.location.href = '/login';
        throw new ApiError('Unauthorized', 401);
      }

      const json = await response.json();
      
      if (!response.ok) {
        throw new ApiError(json.message || `API Error: ${response.status}`, response.status, json);
      }

      return json;
    } catch (error) {
      if (error instanceof ApiError) {
          throw error;
      }
      // Network errors or JSON parsing errors
      console.warn(`API Request Failed: ${endpoint}`, error);
      throw error; 
    }
  }

  // --- Auth ---

  async login(email: string, password: string): Promise<AuthResponse> {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await this.request<AuthResponse>('/auth/login', {
          method: 'POST',
          body: formData
      });

      if (response.data?.token) {
          this.token = response.data.token;
          localStorage.setItem('auth_token', this.token);
          
          // Store first profile ID as per logic
          if (response.data.profiles && response.data.profiles.length > 0) {
              this.profileId = response.data.profiles[0]._id;
              localStorage.setItem('auth_profile_id', this.profileId || '');
              localStorage.setItem('user_data', JSON.stringify(response.data.profiles[0]));
          }
      }

      return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.profileId = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_profile_id');
    localStorage.removeItem('user_data');
  }

  // --- Task Categories ---
  
  async getCategories(): Promise<any[]> {
      const res = await this.request<ApiResponse<any[]>>('/task-categories');
      return res.data || [];
  }

  // --- Tasks (Jobs) ---

  async getTasks(filters: any = {}): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    const res = await this.request<ApiResponse<any[]>>(`/tasks?${query}`);
    return res.data || [];
  }

  async getTask(id: string): Promise<any> {
    const res = await this.request<ApiResponse<any>>(`/tasks/${id}`);
    return res.data;
  }

  async createTask(formData: FormData): Promise<any> {
    const res = await this.request<ApiResponse<any>>('/tasks', {
      method: 'POST',
      body: formData
    });
    return res.data;
  }

  async updateTask(id: string, formData: FormData): Promise<any> {
    const res = await this.request<ApiResponse<any>>(`/tasks/${id}`, {
      method: 'PUT',
      body: formData
    });
    return res.data;
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Applications ---

  async getApplications(filters: any = {}): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    const res = await this.request<ApiResponse<any[]>>(`/applications?${query}`);
    return res.data || [];
  }

  async getApplication(id: string): Promise<any> {
    const res = await this.request<ApiResponse<any>>(`/applications/${id}`);
    return res.data;
  }

  async createApplication(formData: FormData): Promise<any> {
    const res = await this.request<ApiResponse<any>>('/applications', {
      method: 'POST',
      body: formData
    });
    return res.data;
  }

  async updateApplication(id: string, formData: FormData): Promise<any> {
    const res = await this.request<ApiResponse<any>>(`/applications/${id}`, {
      method: 'PUT',
      body: formData
    });
    return res.data;
  }

  // --- Mock Entra for compatibility ---
  async loginWithEntra(): Promise<void> {
      // For now, this is simulated or needs a specific endpoint if one exists
      return new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export const api = new ApiService();
