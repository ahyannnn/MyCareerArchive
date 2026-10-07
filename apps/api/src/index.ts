import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { userContext } from "./middleware/userContext.js";
import { credentialsRouter } from "./routes/credentials.js";
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
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  // Public: liveness + DB connectivity probes.
  app.use("/api", healthRouter);

  // Protected: dev user-context stand-in (x-user-id) + ownership-scoped CRUD.
  // TODO(Phase 4): userContext becomes real session/token auth.
  app.use("/api", userContext);
  app.use("/api", credentialsRouter);
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
