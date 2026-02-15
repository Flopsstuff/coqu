// Common API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// User roles
export type UserRole = "admin";

// User entity (safe — no passwordHash)
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

// Health check
export interface HealthStatus {
  status: "ok" | "error";
  timestamp: string;
  version: string;
}

// Auth
export interface AuthStatus {
  needsSetup: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SetupRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
