// Common API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Example entity
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Health check
export interface HealthStatus {
  status: "ok" | "error";
  timestamp: string;
  version: string;
}
