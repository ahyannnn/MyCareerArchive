import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./index.js";

const savedAuthMax = process.env.RATE_LIMIT_AUTH_MAX;
const savedApiMax = process.env.RATE_LIMIT_API_MAX;

afterEach(() => {
  if (savedAuthMax === undefined) delete process.env.RATE_LIMIT_AUTH_MAX;
  else process.env.RATE_LIMIT_AUTH_MAX = savedAuthMax;
  if (savedApiMax === undefined) delete process.env.RATE_LIMIT_API_MAX;
  else process.env.RATE_LIMIT_API_MAX = savedApiMax;
});

describe("GET /api/health", () => {
  it("returns ok:true without needing a database", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("security headers", () => {
  it("sends helmet headers and hides the stack", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("request ids", () => {
  it("echoes a request id and honors an incoming one", async () => {
    const app = createApp();
    const generated = await request(app).get("/api/health");
    expect(generated.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await request(app).get("/api/health").set("X-Request-Id", "trace-123");
    expect(echoed.headers["x-request-id"]).toBe("trace-123");
  });
});

describe("rate limiting", () => {
  it("throttles auth endpoints per IP with the envelope", async () => {
    process.env.RATE_LIMIT_AUTH_MAX = "2";
    const app = createApp();
    await request(app).post("/api/auth/sign-in/email").send({});
    await request(app).post("/api/auth/sign-in/email").send({});
    const limited = await request(app).post("/api/auth/sign-in/email").send({});
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ ok: false, error: "RATE_LIMITED" });
  });

  it("throttles the general API but never health probes", async () => {
    process.env.RATE_LIMIT_API_MAX = "2";
    const app = createApp();
    await request(app).get("/api/nope");
    await request(app).get("/api/nope");
    const limited = await request(app).get("/api/nope");
    expect(limited.status).toBe(429);

    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
  });
});
