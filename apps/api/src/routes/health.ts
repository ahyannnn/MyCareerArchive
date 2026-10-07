import { Router } from "express";
import { prisma } from "../prisma.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "mycareerarchive-api", timestamp: new Date().toISOString() });
});

// Deep check: verifies Express -> Prisma -> PostgreSQL connectivity.
// Returns 503 (not 500) when the DB is unreachable so load balancers
// and the Phase 1 checklist can distinguish app-up vs db-up.
healthRouter.get("/health/db", async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ ok: false, db: "unconfigured", error: "DATABASE_URL is not set" });
    return;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[health/db]", err);
    res.status(503).json({ ok: false, db: "unreachable" });
  }
});
