import express from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, HealthStatus } from "@coqu/shared";

const app = express();
const prisma = new PrismaClient();
const port = process.env.API_PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
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

// Example: list users
app.get("/api/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    const response: ApiResponse<typeof users> = {
      success: true,
      data: users,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: "Failed to fetch users",
    };
    res.status(500).json(response);
  }
});

// Example: create user
app.post("/api/users", async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = await prisma.user.create({
      data: { email, name },
    });
    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: "Failed to create user",
    };
    res.status(500).json(response);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
