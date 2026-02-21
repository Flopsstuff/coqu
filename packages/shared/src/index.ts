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
export type ProjectStatus = "pending" | "cloning" | "ready" | "error";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  gitUrl: string | null;
  branch: string | null;
  status: ProjectStatus;
  statusMessage: string | null;
  hasGitToken: boolean;
  path: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  gitUrl?: string;
  branch?: string;
  gitToken?: string;
}

export interface BranchListResponse {
  current: string;
  branches: string[];
}

export interface CommitInfoResponse {
  hash: string;
  message: string;
}

// Agents
export type AgentType = "claude-code";

export type AgentStatus = "pending" | "installing" | "installed" | "error";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  statusMessage: string | null;
  version: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequest {
  name: string;
  type: AgentType;
}

export interface UpdateAgentRequest {
  name?: string;
}

export interface AgentEnv {
  content: string;
}
