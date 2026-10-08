import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { userContext } from "./middleware/userContext.js";
import { credentialsRouter } from "./routes/credentials.js";
import { careerRouter } from "./routes/career.js";
import { generateRouter } from "./routes/generate.js";
import { jobsRouter } from "./routes/jobs.js";
import { evidenceRouter } from "./routes/evidence.js";
import { healthRouter } from "./routes/health.js";
import { organizationsRouter } from "./routes/organizations.js";
import { skillsRouter } from "./routes/skills.js";
import { tagsRouter } from "./routes/tags.js";

// Load .env without overriding real environment values (hosted envs win).
// Covers: repo-root cwd, apps/api cwd, src/ layout (tsx), dist/ layout (node).
for (const p of [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "..", "..", ".env"),
  path.join(__dirname, "..", ".env"),
  path.join(__dirname, "..", "..", "..", ".env"),
]) {
  dotenv.config({ path: p });
}

export function createApp() {
  const app = express();

  // CORS FIRST: browsers send an OPTIONS preflight before cross-origin
  // JSON requests, and it must be answered with CORS headers before any
  // route handler runs. cors() never touches the request body stream, so
  // it is safe here. Never "*" with credentials:true.
  const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: webOrigins, credentials: true }));

  // Better Auth SECOND: it reads the raw request stream, so body parsers
  // must not run before it — otherwise auth requests hang. (Express 4
  // wildcard syntax; Express 5 would need "/api/auth/*splat".)
  app.all("/api/auth/*", toNodeHandler(auth));

  // Body parsing LAST (for our own routes only — auth already handled above).
  app.use(express.json({ limit: "1mb" }));

  // Public: liveness + DB connectivity probes.
  app.use("/api", healthRouter);

  // Protected: real session auth (Phase 4) + ownership-scoped CRUD.
  app.use("/api", userContext);
  app.use("/api", credentialsRouter);
  app.use("/api", careerRouter);
  app.use("/api", generateRouter);
  app.use("/api", jobsRouter);
  app.use("/api", evidenceRouter);
  app.use("/api", skillsRouter);
  app.use("/api", tagsRouter);
  app.use("/api", organizationsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

// Only listen when run directly (`tsx src/index.ts` / `node dist/index.js`),
// so supertest can import the app without binding a port.
if (require.main === module) {
  const port = Number(process.env.API_PORT ?? 4000);
  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${port}`);
  });
}
