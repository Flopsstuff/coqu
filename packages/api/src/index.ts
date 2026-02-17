import crypto from "crypto";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient, User as PrismaUser } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {
  ApiResponse,
  ApiToken,
  AuthResponse,
  AuthStatus,
  CreateTokenResponse,
  HealthStatus,
  PingResponse,
  Project,
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

function toProject(p: { id: string; name: string; description: string | null; path: string | null; createdAt: Date; updatedAt: Date }): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
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
  const { name, description, path } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ success: false, error: "Project name is required" } satisfies ApiResponse<never>);
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      path: path?.trim() || null,
    },
  });

  const response: ApiResponse<Project> = {
    success: true,
    data: toProject(project),
  };
  res.status(201).json(response);
});

// --- Graceful shutdown ---

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
