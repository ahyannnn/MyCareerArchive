import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./index.js";

describe("GET /api/health", () => {
  it("returns ok:true without needing a database", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
