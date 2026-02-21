import fs from "fs";
import path from "path";
import pino from "pino";

export const LOG_DIR = process.env.LOG_DIR || "./logs";
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || "30", 10);

fs.mkdirSync(LOG_DIR, { recursive: true });

export const logger = pino({
  level: "info",
  transport: {
    target: "pino-roll",
    options: {
      file: path.join(LOG_DIR, "app"),
      frequency: "daily",
      dateFormat: "yyyy-MM-dd",
      extension: ".log",
      mkdir: true,
    },
  },
});

export function cleanupOldLogs(): void {
  const now = Date.now();
  const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let files: string[];
  try {
    files = fs.readdirSync(LOG_DIR);
  } catch {
    return;
  }

  const logRe = /^app\.\d{4}-\d{2}-\d{2}\.\d+\.log$/;
  for (const file of files) {
    if (!logRe.test(file)) continue;
    const filePath = path.join(LOG_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore individual file errors
    }
  }
}
