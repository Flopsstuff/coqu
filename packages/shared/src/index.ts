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

// API Tokens
export interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateTokenRequest {
  name: string;
}

export interface CreateTokenResponse {
  token: string;
  apiToken: ApiToken;
}

export interface PingResponse {
  message: string;
  timestamp: string;
  userId: string;
}

// Query
export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  query: string;
  result: string;
  timestamp: string;
}

// Projects
export interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  path?: string;
}
