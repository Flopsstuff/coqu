import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execFile, ChildProcess } from "child_process";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient, User as PrismaUser } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {
  Agent,
  AgentEnv,
  AgentStatus,
  AgentType,
  ApiResponse,
  ApiToken,
  AuthResponse,
  AuthStatus,
  BranchListResponse,
  CommitInfoResponse,
  CreateTokenResponse,
  HealthStatus,
  PingResponse,
  Project,
  ProjectStatus,
  QueryResponse,
  User,
} from "@coqu/shared";

const app = express();
const prisma = new PrismaClient();
const port = process.env.API_PORT || 4000;
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be set");
}
const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.GIT_TOKEN_SECRET) {
  throw new Error("GIT_TOKEN_SECRET environment variable must be set");
}
const GIT_TOKEN_SECRET = process.env.GIT_TOKEN_SECRET;

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || "/workspace";
fs.mkdirSync(WORKSPACE_PATH, { recursive: true });
console.log(`Workspace directory initialized at ${WORKSPACE_PATH}`);

app.use(helmet());
app.use(cors());
app.use(express.json());

// --- Helpers ---

function toSafeUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as User["role"],
    createdAt: user.createdAt.toISOString(),
  };
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function generateToken(): string {
  return "coqu_" + crypto.randomBytes(32).toString("hex");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// --- Git token encryption ---

function deriveEncryptionKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

const encryptionKey = deriveEncryptionKey(GIT_TOKEN_SECRET);

function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptToken(encrypted: string): string {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// --- Auth middleware ---

interface AuthRequest extends Request {
  userId?: string;
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>);
    return;
  }

  const bearer = header.slice(7);

  // Try JWT first (no DB hit)
  try {
    const payload = jwt.verify(bearer, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
    return;
  } catch {
    // Not a valid JWT — try API token
  }

  // Try API token
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(bearer) },
  });
  if (token) {
    req.userId = token.userId;
    // Update lastUsedAt fire-and-forget
    prisma.apiToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});
    next();
    return;
  }

  res.status(401).json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>);
}

// --- Health check ---

app.get("/health", (_req, res) => {
  const health: ApiResponse<HealthStatus> = {
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
    },
  };
  res.json(health);
});

// --- Auth routes ---

app.get("/api/auth/status", async (_req, res) => {
  const count = await prisma.user.count();
  const response: ApiResponse<AuthStatus> = {
    success: true,
    data: { needsSetup: count === 0 },
  };
  res.json(response);
});

app.post("/api/auth/setup", async (req, res) => {
  const count = await prisma.user.count();
  if (count > 0) {
    res.status(400).json({ success: false, error: "Setup already completed" } satisfies ApiResponse<never>);
    return;
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ success: false, error: "Name, email, and password are required" } satisfies ApiResponse<never>);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "admin" },
  });

  const token = signToken(user.id);
  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: { token, user: toSafeUser(user) },
  };
  res.status(201).json(response);
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: "Email and password are required" } satisfies ApiResponse<never>);
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ success: false, error: "Invalid credentials" } satisfies ApiResponse<never>);
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: "Invalid credentials" } satisfies ApiResponse<never>);
    return;
  }

  const token = signToken(user.id);
  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: { token, user: toSafeUser(user) },
  };
  res.json(response);
});

app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(401).json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>);
    return;
  }
  const response: ApiResponse<User> = {
    success: true,
    data: toSafeUser(user),
  };
  res.json(response);
});

// --- Protected routes ---

app.get("/api/users", requireAuth, async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    const response: ApiResponse<User[]> = {
      success: true,
      data: users.map(toSafeUser),
    };
    res.json(response);
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" } satisfies ApiResponse<never>);
  }
});

app.post("/api/users", requireAuth, async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });
    const response: ApiResponse<User> = {
      success: true,
      data: toSafeUser(user),
    };
    res.status(201).json(response);
  } catch {
    res.status(500).json({ success: false, error: "Failed to create user" } satisfies ApiResponse<never>);
  }
});

// --- Token routes ---

function toSafeToken(t: { id: string; name: string; createdAt: Date; lastUsedAt: Date | null }): ApiToken {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.createdAt.toISOString(),
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
  };
}

app.get("/api/tokens", requireAuth, async (req: AuthRequest, res) => {
  const tokens = await prisma.apiToken.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  const response: ApiResponse<ApiToken[]> = {
    success: true,
    data: tokens.map(toSafeToken),
  };
  res.json(response);
});

app.post("/api/tokens", requireAuth, async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ success: false, error: "Token name is required" } satisfies ApiResponse<never>);
    return;
  }

  const raw = generateToken();
  const apiToken = await prisma.apiToken.create({
    data: {
      name: name.trim(),
      tokenHash: hashToken(raw),
      userId: req.userId!,
    },
  });

  const response: ApiResponse<CreateTokenResponse> = {
    success: true,
    data: { token: raw, apiToken: toSafeToken(apiToken) },
  };
  res.status(201).json(response);
});

app.delete("/api/tokens/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const token = await prisma.apiToken.findUnique({ where: { id } });
  if (!token || token.userId !== req.userId) {
    res.status(404).json({ success: false, error: "Token not found" } satisfies ApiResponse<never>);
    return;
  }

  await prisma.apiToken.delete({ where: { id: token.id } });
  res.json({ success: true } satisfies ApiResponse<never>);
});

// --- Ping ---

app.get("/api/ping", requireAuth, async (req: AuthRequest, res) => {
  const response: ApiResponse<PingResponse> = {
    success: true,
    data: {
      message: "pong",
      timestamp: new Date().toISOString(),
      userId: req.userId!,
    },
  };
  res.json(response);
});

// --- Query ---

app.post("/api/query", requireAuth, async (req: AuthRequest, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    res.status(400).json({ success: false, error: "Query is required" } satisfies ApiResponse<never>);
    return;
  }

  const delay = 3000 + Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const response: ApiResponse<QueryResponse> = {
    success: true,
    data: {
      query: query.trim(),
      result: `Dummy result for: "${query.trim()}"`,
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

// --- Projects ---

// Track active clone processes for cleanup on delete
const activeClones = new Map<string, ChildProcess>();

function toProject(p: { id: string; name: string; description: string | null; gitUrl: string | null; branch: string | null; status: string; statusMessage: string | null; gitToken: string | null; path: string | null; createdAt: Date; updatedAt: Date }): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    gitUrl: p.gitUrl,
    branch: p.branch,
    status: p.status as ProjectStatus,
    statusMessage: p.statusMessage,
    hasGitToken: p.gitToken !== null,
    path: p.path,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

app.get("/api/projects", requireAuth, async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const response: ApiResponse<Project[]> = {
    success: true,
    data: projects.map(toProject),
  };
  res.json(response);
});

app.post("/api/projects", requireAuth, async (req, res) => {
  const { name, description, gitUrl, branch, gitToken } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ success: false, error: "Project name is required" } satisfies ApiResponse<never>);
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      gitUrl: gitUrl?.trim() || null,
      branch: branch?.trim() || null,
      gitToken: gitToken ? encryptToken(gitToken) : null,
    },
  });

  const response: ApiResponse<Project> = {
    success: true,
    data: toProject(project),
  };
  res.status(201).json(response);
});

app.get("/api/projects/:id", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }
  const response: ApiResponse<Project> = { success: true, data: toProject(project) };
  res.json(response);
});

app.patch("/api/projects/:id", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }

  const data: Record<string, unknown> = {};
  if (req.body.name !== undefined) data.name = req.body.name.trim();
  if (req.body.description !== undefined) data.description = req.body.description?.trim() || null;
  if (req.body.gitUrl !== undefined) data.gitUrl = req.body.gitUrl?.trim() || null;
  if (req.body.branch !== undefined) data.branch = req.body.branch?.trim() || null;
  if (req.body.gitToken !== undefined) {
    data.gitToken = req.body.gitToken ? encryptToken(req.body.gitToken) : null;
  }

  const updated = await prisma.project.update({ where: { id: req.params.id as string }, data });
  const response: ApiResponse<Project> = { success: true, data: toProject(updated) };
  res.json(response);
});

app.delete("/api/projects/:id", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }

  // Kill active clone if any
  const activeClone = activeClones.get(project.id);
  if (activeClone) {
    activeClone.kill();
    activeClones.delete(project.id);
  }

  await prisma.project.delete({ where: { id: project.id } });

  // Remove workspace directory
  const projectDir = path.join(WORKSPACE_PATH, project.id);
  fs.rm(projectDir, { recursive: true, force: true }, () => {});

  res.json({ success: true } satisfies ApiResponse<never>);
});

// --- Git Clone ---

const CLONE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function injectPatIntoUrl(gitUrl: string, pat: string): string {
  const url = new URL(gitUrl);
  url.username = pat;
  url.password = "";
  return url.toString();
}

function scrubPat(message: string, pat: string): string {
  return message.replaceAll(pat, "***");
}

function cloneProject(projectId: string, gitUrl: string, branch: string | null, encryptedToken: string | null): void {
  const projectDir = path.join(WORKSPACE_PATH, projectId);
  let pat: string | null = null;
  let cloneUrl = gitUrl;

  if (encryptedToken) {
    pat = decryptToken(encryptedToken);
    cloneUrl = injectPatIntoUrl(gitUrl, pat);
  }

  const args = ["clone"];
  if (branch) {
    args.push("--branch", branch, "--single-branch");
  }
  args.push(cloneUrl, projectDir);

  const child = execFile("git", args, { timeout: CLONE_TIMEOUT }, async (error, _stdout, stderr) => {
    activeClones.delete(projectId);

    if (error) {
      const isTimeout = error.killed || error.code === "ETIMEDOUT";
      const message = isTimeout ? "Clone timed out" : (pat ? scrubPat(stderr || error.message, pat) : (stderr || error.message));
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "error", statusMessage: message },
      }).catch(() => {});
      return;
    }

    // Detect actual branch after clone
    execFile("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: projectDir }, async (branchErr, branchStdout) => {
      const detectedBranch = branchErr ? null : branchStdout.trim();
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ready", path: projectDir, statusMessage: null, branch: detectedBranch },
      }).catch(() => {});
    });
  });

  activeClones.set(projectId, child);
}

app.post("/api/projects/:id/clone", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }

  if (!project.gitUrl) {
    res.status(400).json({ success: false, error: "Project has no git URL" } satisfies ApiResponse<never>);
    return;
  }

  if (project.status === "cloning") {
    res.status(409).json({ success: false, error: "Clone already in progress" } satisfies ApiResponse<never>);
    return;
  }

  if (project.status === "ready") {
    res.status(409).json({ success: false, error: "Project already cloned" } satisfies ApiResponse<never>);
    return;
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { status: "cloning", statusMessage: null },
  });

  cloneProject(project.id, project.gitUrl, project.branch, project.gitToken);

  const response: ApiResponse<Project> = { success: true, data: toProject(updated) };
  res.status(202).json(response);
});

// --- Branch management ---

app.get("/api/projects/:id/branches", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }
  if (project.status !== "ready" || !project.path) {
    res.status(400).json({ success: false, error: "Project is not ready" } satisfies ApiResponse<never>);
    return;
  }

  execFile("git", ["branch", "-a"], { cwd: project.path }, (err, stdout) => {
    if (err) {
      res.status(500).json({ success: false, error: "Failed to list branches" } satisfies ApiResponse<never>);
      return;
    }

    let current = "";
    const branchSet = new Set<string>();

    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("* ")) {
        current = trimmed.slice(2);
        branchSet.add(current);
      } else if (trimmed.startsWith("remotes/origin/")) {
        const name = trimmed.replace("remotes/origin/", "");
        if (name !== "HEAD" && !name.startsWith("HEAD ")) {
          branchSet.add(name);
        }
      } else {
        branchSet.add(trimmed);
      }
    }

    const branches = [...branchSet].sort();
    const response: ApiResponse<BranchListResponse> = {
      success: true,
      data: { current, branches },
    };
    res.json(response);
  });
});

app.post("/api/projects/:id/checkout", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }
  if (project.status !== "ready" || !project.path) {
    res.status(400).json({ success: false, error: "Project is not ready" } satisfies ApiResponse<never>);
    return;
  }

  const { branch } = req.body;
  if (!branch || typeof branch !== "string" || branch.trim().length === 0) {
    res.status(400).json({ success: false, error: "Branch name is required" } satisfies ApiResponse<never>);
    return;
  }

  execFile("git", ["checkout", branch.trim()], { cwd: project.path }, async (err, _stdout, stderr) => {
    if (err) {
      res.status(400).json({ success: false, error: stderr || err.message } satisfies ApiResponse<never>);
      return;
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { branch: branch.trim() },
    });
    const response: ApiResponse<Project> = { success: true, data: toProject(updated) };
    res.json(response);
  });
});

app.get("/api/projects/:id/commit", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }
  if (project.status !== "ready" || !project.path) {
    res.status(400).json({ success: false, error: "Project is not ready" } satisfies ApiResponse<never>);
    return;
  }

  execFile("git", ["log", "-1", "--format=%H%n%s"], { cwd: project.path }, (err, stdout) => {
    if (err) {
      res.status(500).json({ success: false, error: "Failed to get commit info" } satisfies ApiResponse<never>);
      return;
    }
    const lines = stdout.trim().split("\n");
    const response: ApiResponse<CommitInfoResponse> = {
      success: true,
      data: { hash: lines[0], message: lines.slice(1).join("\n") },
    };
    res.json(response);
  });
});

app.post("/api/projects/:id/pull", requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" } satisfies ApiResponse<never>);
    return;
  }
  if (project.status !== "ready" || !project.path) {
    res.status(400).json({ success: false, error: "Project is not ready" } satisfies ApiResponse<never>);
    return;
  }

  execFile("git", ["pull"], { cwd: project.path }, (err, _stdout, stderr) => {
    if (err) {
      res.status(400).json({ success: false, error: stderr || err.message } satisfies ApiResponse<never>);
      return;
    }
    const response: ApiResponse<Project> = { success: true, data: toProject(project) };
    res.json(response);
  });
});

// --- Agents ---

function toAgent(a: { id: string; name: string; type: string; status: string; statusMessage: string | null; version: string | null; createdAt: Date; updatedAt: Date }): Agent {
  return {
    id: a.id,
    name: a.name,
    type: a.type as AgentType,
    status: a.status as AgentStatus,
    statusMessage: a.statusMessage,
    version: a.version,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

const activeInstalls = new Map<string, ChildProcess>();
const INSTALL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function installAgent(agentId: string): void {
  prisma.agent.update({
    where: { id: agentId },
    data: { status: "installing", statusMessage: null },
  }).then(() => {
    const child = execFile("npm", ["install", "-g", "@anthropic-ai/claude-code"], { timeout: INSTALL_TIMEOUT }, async (error, _stdout, stderr) => {
      activeInstalls.delete(agentId);

      if (error) {
        const isTimeout = error.killed || error.code === "ETIMEDOUT";
        const message = isTimeout ? "Installation timed out" : (stderr || error.message);
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: "error", statusMessage: message },
        }).catch(() => {});
        return;
      }

      // Detect version
      execFile("claude", ["--version"], {}, async (verErr, verStdout) => {
        const version = verErr ? null : verStdout.trim();
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: "installed", statusMessage: null, version },
        }).catch(() => {});
      });
    });

    activeInstalls.set(agentId, child);
  }).catch(() => {});
}

async function checkAgentHealth(): Promise<void> {
  const agents = await prisma.agent.findMany({ where: { status: "installed" } });
  for (const agent of agents) {
    await new Promise<void>((resolve) => {
      execFile("which", ["claude"], {}, (err) => {
        if (err) {
          console.log(`Agent ${agent.id} binary missing, reinstalling...`);
          installAgent(agent.id);
        }
        resolve();
      });
    });
  }
}

app.get("/api/agents", requireAuth, async (_req, res) => {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: "desc" } });
  const response: ApiResponse<Agent[]> = { success: true, data: agents.map(toAgent) };
  res.json(response);
});

app.post("/api/agents", requireAuth, async (req, res) => {
  const { name, type } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ success: false, error: "Agent name is required" } satisfies ApiResponse<never>);
    return;
  }
  const validTypes = ["claude-code"];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ success: false, error: "Invalid agent type" } satisfies ApiResponse<never>);
    return;
  }

  const agent = await prisma.agent.create({
    data: { name: name.trim(), type },
  });

  installAgent(agent.id);

  const response: ApiResponse<Agent> = { success: true, data: toAgent(agent) };
  res.status(201).json(response);
});

app.get("/api/agents/:id", requireAuth, async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id as string } });
  if (!agent) {
    res.status(404).json({ success: false, error: "Agent not found" } satisfies ApiResponse<never>);
    return;
  }
  const response: ApiResponse<Agent> = { success: true, data: toAgent(agent) };
  res.json(response);
});

app.patch("/api/agents/:id", requireAuth, async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id as string } });
  if (!agent) {
    res.status(404).json({ success: false, error: "Agent not found" } satisfies ApiResponse<never>);
    return;
  }

  const data: Record<string, unknown> = {};
  if (req.body.name !== undefined) data.name = req.body.name.trim();

  const updated = await prisma.agent.update({ where: { id: agent.id }, data });
  const response: ApiResponse<Agent> = { success: true, data: toAgent(updated) };
  res.json(response);
});

app.delete("/api/agents/:id", requireAuth, async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id as string } });
  if (!agent) {
    res.status(404).json({ success: false, error: "Agent not found" } satisfies ApiResponse<never>);
    return;
  }

  // Kill active install if any
  const activeInstall = activeInstalls.get(agent.id);
  if (activeInstall) {
    activeInstall.kill();
    activeInstalls.delete(agent.id);
  }

  await prisma.agent.delete({ where: { id: agent.id } });

  // npm uninstall -g (fire and forget)
  if (agent.type === "claude-code") {
    execFile("npm", ["uninstall", "-g", "@anthropic-ai/claude-code"], () => {});
  }

  res.json({ success: true } satisfies ApiResponse<never>);
});

app.post("/api/agents/:id/install", requireAuth, async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id as string } });
  if (!agent) {
    res.status(404).json({ success: false, error: "Agent not found" } satisfies ApiResponse<never>);
    return;
  }

  if (agent.status === "installing") {
    res.status(409).json({ success: false, error: "Installation already in progress" } satisfies ApiResponse<never>);
    return;
  }

  installAgent(agent.id);

  const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
  const response: ApiResponse<Agent> = { success: true, data: toAgent(updated!) };
  res.status(202).json(response);
});

// --- Global Environment ---

app.get("/api/env", requireAuth, async (_req, res) => {
  const envPath = path.join(process.env.HOME || "/root", ".coqu", ".env");
  let content = "";
  try {
    content = fs.readFileSync(envPath, "utf-8");
  } catch {
    // File doesn't exist, return empty
  }

  const response: ApiResponse<AgentEnv> = { success: true, data: { content } };
  res.json(response);
});

app.put("/api/env", requireAuth, async (req, res) => {
  const { content } = req.body;
  const envDir = path.join(process.env.HOME || "/root", ".coqu");
  fs.mkdirSync(envDir, { recursive: true });
  fs.writeFileSync(path.join(envDir, ".env"), content ?? "");

  res.json({ success: true } satisfies ApiResponse<never>);
});

// --- Graceful shutdown ---

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
  checkAgentHealth().catch((err) => {
    console.error("Agent health check failed:", err);
  });
});
