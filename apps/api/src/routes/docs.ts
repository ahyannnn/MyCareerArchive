import { readFileSync } from "node:fs";
import path from "node:path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse as parseYaml } from "yaml";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const docsRouter = Router();

// openapi.yaml lives at the package root (apps/api/openapi.yaml).
// Resolve like .env: try cwd first, then relative to this file, so both
// `tsx src/*` and `node dist/*` layouts work.
function specPath(): string {
  const candidates = [
    path.join(process.cwd(), "openapi.yaml"),
    path.join(__dirname, "..", "..", "openapi.yaml"),
  ];
  const found = candidates.find((p) => {
    try {
      readFileSync(p, "utf8");
      return true;
    } catch {
      return false;
    }
  });
  if (!found) throw new Error("openapi.yaml not found (checked cwd and package root)");
  return found;
}

let cachedSpec: Record<string, unknown> | null = null;

export function loadOpenApiSpec(): Record<string, unknown> {
  if (!cachedSpec) {
    cachedSpec = parseYaml(readFileSync(specPath(), "utf8")) as Record<string, unknown>;
  }
  return cachedSpec;
}

// Test-only: drop the cache so file changes are visible between tests.
export function __resetDocsForTests(): void {
  cachedSpec = null;
}

docsRouter.get(
  "/openapi.yaml",
  asyncHandler(async (_req, res) => {
    res.type("text/yaml").send(readFileSync(specPath(), "utf8"));
  }),
);

docsRouter.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    explorer: true,
    swaggerOptions: { url: "/api/openapi.yaml" },
  }),
);
