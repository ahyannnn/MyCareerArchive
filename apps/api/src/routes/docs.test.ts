import request from "supertest";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { createApp } from "../index.js";

const app = createApp();

describe("GET /api/openapi.yaml", () => {
  it("serves a parseable spec covering every router", async () => {
    const res = await request(app).get("/api/openapi.yaml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("yaml");
    const spec = parseYaml(res.text) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(spec.openapi.startsWith("3.")).toBe(true);
    for (const p of [
      "/api/health",
      "/api/credentials",
      "/api/credentials/{id}",
      "/api/credentials/{id}/evidence/initiate",
      "/api/evidence/{id}/complete",
      "/api/skills",
      "/api/tags",
      "/api/organizations",
      "/api/timeline",
      "/api/career/profile",
      "/api/resume/build",
      "/api/portfolio/build",
      "/api/resume/bullets",
      "/api/interviews/prepare",
      "/api/jobs/search",
      "/api/openapi.yaml",
      "/api/docs",
    ]) {
      expect(spec.paths, `missing path ${p}`).toHaveProperty(p);
    }
  });
});

describe("GET /api/docs", () => {
  it("serves the interactive reference without auth", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("html");
    expect(res.text).toContain("swagger");
  });
});
