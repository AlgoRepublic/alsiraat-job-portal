import {
  Job,
  Application,
  ApplicantProfile,
  UserRole,
  JobStatus,
} from "../types";

// In production (single container), use relative path. In dev, use full URL.
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.PROD ? "/api" : "http://localhost:5001/api");

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface AuthResponse {
  token: string;
  user: any;
}

class ApiService {
  private token: string | null = localStorage.getItem("auth_token");

  private getHeaders(isFormData = false): HeadersInit {
    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    // Content-Type is automatically set by browser when body is FormData
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
      headers["Accept"] = "application/json";
    }
    return headers;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const isFormData = options.body instanceof FormData;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(isFormData),
          ...options.headers,
        },
      });

      if (response.status === 401 && !endpoint.includes("/auth/login")) {
        this.logout();
        window.location.href = "/login";
        throw new ApiError("Unauthorized", 401);
      }

      const json = await response.json();

      if (!response.ok) {
        throw new ApiError(
          json.message || `API Error: ${response.status}`,
          response.status,
          json,
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.warn(`API Request Failed: ${endpoint}`, error);
      throw error;
    }
  }

  // --- Generic Methods ---

  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  public async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // --- Auth ---

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.token = response.token;
      localStorage.setItem("auth_token", this.token);
      localStorage.setItem("user_data", JSON.stringify(response.user));
    }

    return response;
  }

  async signup(userData: any): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.token) {
      this.token = response.token;
      localStorage.setItem("auth_token", this.token);
      localStorage.setItem("user_data", JSON.stringify(response.user));
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
  }

  // --- Organizations ---
  async getOrganizations(): Promise<any[]> {
    return this.request<any[]>("/organizations");
  }

  async createOrganization(data: any): Promise<any> {
    return this.request<any>("/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Tasks (Jobs) ---

  async getTasks(filters: any = {}): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    return this.request<any[]>(`/tasks?${query}`);
  }

  async getTask(id: string): Promise<any> {
    return this.request<any>(`/tasks/${id}`);
  }

  async createTask(data: any): Promise<any> {
    return this.request<any>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async approveTask(
    id: string,
    status: "approve" | "decline" = "approve",
    rejectionReason?: string,
  ): Promise<any> {
    return this.request<any>(`/tasks/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({ status, rejectionReason }),
    });
  }

  // --- Applications ---

  async getApplications(filters: any = {}): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    return this.request<any[]>(`/applications?${query}`);
  }

  async getApplication(id: string): Promise<any> {
    return this.request<any>(`/applications/${id}`);
  }

  async applyForTask(data: any): Promise<any> {
    return this.request<any>("/applications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateApplicationStatus(id: string, status: string): Promise<any> {
    return this.request<any>(`/applications/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // --- Notifications ---
  async getNotifications(): Promise<any[]> {
    return this.request<any[]>("/notifications");
  }

  async markNotificationRead(id: string): Promise<any> {
    return this.request<any>(`/notifications/${id}/read`, {
      method: "PUT",
    });
  }

  // --- Reward Types ---
  async getRewardTypes(): Promise<any[]> {
    return this.request<any[]>("/reward-types");
  }

  // --- Task Categories ---
  async getTaskCategories(): Promise<any[]> {
    return this.request<any[]>("/task-categories");
  }

  // --- Roles ---
  async getRoles(): Promise<any[]> {
    return this.request<any[]>("/roles");
  }

  // --- Task Creation with Files ---
  async createTaskWithFiles(data: any, files: File[]): Promise<any> {
    const formData = new FormData();

    // Add all form fields
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        if (Array.isArray(data[key])) {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key].toString());
        }
      }
    });

    // Add files
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    return this.request<any>("/tasks", {
      method: "POST",
      body: formData,
    });
  }
}

export const api = new ApiService();
