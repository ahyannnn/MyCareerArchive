import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../index.js";
import { prisma } from "../prisma.js";

const app = createApp();
const savedUrl = process.env.DATABASE_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (savedUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedUrl;
});

describe("GET /api/health/db", () => {
  it("reports connected when the database answers", async () => {
    const res = await request(app).get("/api/health/db");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, db: "connected" });
  });

  it("reports unconfigured when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const res = await request(app).get("/api/health/db");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, db: "unconfigured" });
  });

  it("reports unreachable when the database throws", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));
    const res = await request(app).get("/api/health/db");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, db: "unreachable" });
  });
});
