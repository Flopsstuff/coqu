import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient, User as PrismaUser } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {
  ApiResponse,
  AuthResponse,
  AuthStatus,
  HealthStatus,
  User,
} from "@coqu/shared";

const app = express();
const prisma = new PrismaClient();
const port = process.env.API_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";

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

// --- Auth middleware ---

interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>);
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>);
  }
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

// --- Graceful shutdown ---

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
