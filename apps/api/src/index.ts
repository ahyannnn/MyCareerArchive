import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { corsOrigin } from "./lib/cors.js";
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
import { docsRouter } from "./routes/docs.js";
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

  // Behind Render's TLS-terminating proxy there is exactly one hop, so the
  // left-most X-Forwarded-For entry is the client. Required for correct
  // rate-limit keys (without it every client shares one bucket).
  app.set("trust proxy", 1);

  // Security headers (hides X-Powered-By, no-sniff, framing, etc.).
  // JSON API: defaults are safe; no frontend is served from here.
  app.use(helmet());

  // Request logging with correlation ids. Honors an incoming X-Request-Id
  // (for tracing across web -> api), otherwise generates one; echoed back
  // so clients can quote it in bug reports. Never touches the body stream.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
      customProps: (req) => ({ requestId: (req as unknown as { id: string }).id }),
    }),
  );
  app.use((req, res, next) => {
    res.setHeader("X-Request-Id", (req as unknown as { id: string }).id);
    next();
  });

  // Brute-force backstop for auth endpoints. Better-auth also rate-limits
  // in production (100/10s); this caps sustained per-IP abuse instead.
  // Knobs are env-driven so tests can shrink the window without code changes.
  const numEnv = (name: string, fallback: number) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  const windowMs = numEnv("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
  const authLimiter = rateLimit({
    windowMs,
    max: numEnv("RATE_LIMIT_AUTH_MAX", 100),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "RATE_LIMITED", message: "Too many auth attempts, try again later" },
  });

  // General API abuse backstop (generous: normal use never approaches it).
  const apiLimiter = rateLimit({
    windowMs,
    max: numEnv("RATE_LIMIT_API_MAX", 600),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "RATE_LIMITED", message: "Too many requests, try again later" },
  });

  // CORS FIRST: browsers send an OPTIONS preflight before cross-origin
  // JSON requests, and it must be answered with CORS headers before any
  // route handler runs. cors() never touches the request body stream, so
  // it is safe here. Origins come from lib/cors: exact WEB_ORIGIN entries
  // plus WEB_ORIGIN_PATTERNS globs (e.g. Vercel previews). Never "*" with
  // credentials:true.
  app.use(cors({ origin: corsOrigin, credentials: true }));

  // Better Auth SECOND: it reads the raw request stream, so body parsers
  // must not run before it — otherwise auth requests hang. (Express 4
  // wildcard syntax; Express 5 would need "/api/auth/*splat".)
  app.use("/api/auth", authLimiter);
  app.all("/api/auth/*", toNodeHandler(auth));

  // Body parsing LAST (for our own routes only — auth already handled above).
  app.use(express.json({ limit: "1mb" }));

  // Public: liveness + DB connectivity probes. Unthrottled so uptime
  // monitors and load balancers never get a 429.
  app.use("/api", healthRouter);
  // Public: interactive API reference + raw spec. Unthrottled for the same reason.
  app.use("/api", docsRouter);

  // Protected: real session auth (Phase 4) + ownership-scoped CRUD.
  app.use("/api", apiLimiter);
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
/* v8 ignore next 8 -- process entrypoint, exercised by deployment not tests */
if (require.main === module) {
  // Render injects PORT; API_PORT is the local/dev override.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  const app = createApp();
  app.listen(port, () => {
    logger.info({ port }, "[api] listening");
  });
}
