import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { prisma } from "../prisma.js";
import {
  createTestAgent,
  deleteTestUser,
  type TestAgent,
} from "../test-utils/db.js";
import { takeTestEmail } from "../auth.js";

// Phase 4 auth flows: real register/login/logout through Better Auth's
// /api/auth/* endpoints with session cookies — the same mechanism browsers use.
// Email verification is STRICT here (requireEmailVerification): unverified
// users cannot log in, and the helper verifies test users via real tokens.
const app = createApp();
const ORIGIN = "http://localhost:3000";
let user!: TestAgent;

beforeAll(async () => {
  user = await createTestAgent(app, "auth-flows");
});

afterAll(async () => {
  await deleteTestUser(user.userId);
});

describe("auth flows", () => {
  it("answers browser preflights on auth routes (CORS regression)", async () => {
    // Reproduces what Chrome sends before POST /api/auth/* from :3000.
    // If cors() ever moves behind the auth mount again, this fails the
    // same way the browser did: no Access-Control-Allow-Origin header.
    const res = await request(app)
      .options("/api/auth/sign-in/social")
      .set("Origin", ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("reports the signed-in session", async () => {
    const res = await user.agent.get("/api/auth/get-session").set("Origin", ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body?.user?.email).toBe(user.email);
  });

  it("signs out and loses access, then signs back in", async () => {
    const before = await user.agent.get("/api/credentials");
    expect(before.status).toBe(200);

    const signOut = await user.agent.post("/api/auth/sign-out").set("Origin", ORIGIN);
    expect([200, 204]).toContain(signOut.status);

    const after = await user.agent.get("/api/credentials");
    expect(after.status).toBe(401);
    expect(after.body.error).toBe("UNAUTHENTICATED");

    const signIn = await user.agent
      .post("/api/auth/sign-in/email")
      .set("Origin", ORIGIN)
      .send({ email: user.email, password: user.password });
    expect(signIn.status).toBe(200);

    const again = await user.agent.get("/api/credentials");
    expect(again.status).toBe(200);
  });

  it("serves get-session from the signed cookie cache without a DB read", async () => {
    // Proves the cookieCache fast path: with every server-side Session row
    // deleted, a valid signed cache cookie must still authenticate (this is
    // the ≤5min revocation-propagation tradeoff, accepted deliberately).
    const check = await user.agent.get("/api/auth/get-session").set("Origin", ORIGIN);
    expect(check.status).toBe(200);
    await prisma.session.deleteMany({ where: { userId: user.userId } });
    try {
      const cached = await user.agent.get("/api/auth/get-session").set("Origin", ORIGIN);
      expect(cached.status).toBe(200);
      expect(cached.body?.user?.email).toBe(user.email);
      // A forged session cookie still fails closed (bad signature → DB
      // lookup → no row → 401), so the fast path weakens nothing.
      const forged = await request(app)
        .get("/api/credentials")
        .set("Origin", ORIGIN)
        .set("Cookie", "better-auth.session_token=forged-token-value");
      expect(forged.status).toBe(401);
      expect(forged.body.error).toBe("UNAUTHENTICATED");
    } finally {
      // Restore a real session row for the rest of the suite.
      const signIn = await user.agent
        .post("/api/auth/sign-in/email")
        .set("Origin", ORIGIN)
        .send({ email: user.email, password: user.password });
      expect(signIn.status).toBe(200);
    }
  });

  it("rejects wrong passwords", async () => {    const res = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", ORIGIN)
      .send({ email: user.email, password: "WrongPassword999!" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    // Better Auth error shape: { code, message } — and crucially no session.
    expect(res.body).not.toHaveProperty("token");
    expect(typeof res.body?.code === "string" || typeof res.body?.message === "string").toBe(true);
  });

  it("returns success (not an error) for duplicate registration", async () => {
    // Anti-enumeration: with requireEmailVerification on, Better Auth answers
    // success for taken emails so attackers can't probe which emails exist.
    // Nothing must change in the database and no session may be granted.
    const before = await prisma.user.count({ where: { email: user.email } });
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", ORIGIN)
      .send({ name: "Dupe", email: user.email, password: user.password });
    expect([200, 201]).toContain(res.status);
    expect(await prisma.user.count({ where: { email: user.email } })).toBe(before);
  });

  it("rejects weak passwords at signup", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", ORIGIN)
      .send({ name: "Weak", email: `weak-${Date.now()}@example.com`, password: "short" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("email verification gate", () => {
  it("blocks sign-in until the inbox link is clicked", async () => {
    const email = `gated-${Date.now()}@example.com`;
    const agent = request.agent(app);
    const signup = await agent
      .post("/api/auth/sign-up/email")
      .set("Origin", ORIGIN)
      .send({ name: "Gated", email, password: "GatedTest123!" });
    expect([200, 201]).toContain(signup.status);

    const blocked = await agent
      .post("/api/auth/sign-in/email")
      .set("Origin", ORIGIN)
      .send({ email, password: "GatedTest123!" });
    expect(blocked.status).toBeGreaterThanOrEqual(400);

    const gated = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(gated.emailVerified).toBe(false);

    // Click the inbox link: the signed token comes from the test outbox —
    // the same token a real email would carry (email-verification tokens
    // are stateless JWTs, not database rows).
    const { token } = takeTestEmail(email, "verification");
    await agent.get("/api/auth/verify-email").query({ token, callbackURL: "/" });

    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);

    const allowed = await agent
      .post("/api/auth/sign-in/email")
      .set("Origin", ORIGIN)
      .send({ email, password: "GatedTest123!" });
    expect(allowed.status).toBe(200);

    await prisma.user.deleteMany({ where: { id: gated.id } });
  });

  it("rejects bogus verification tokens", async () => {
    // Invalid tokens redirect (302) instead of verifying anyone: the
    // security property is that no account flips to verified.
    const email = `bogus-${Date.now()}@example.com`;
    await request(app).post("/api/auth/sign-up/email").set("Origin", ORIGIN).send({
      name: "Bogus",
      email,
      password: "BogusTest123!",
    });
    const res = await request(app)
      .get("/api/auth/verify-email")
      .query({ token: "definitely-not-a-real-token", callbackURL: "/" });
    expect(res.status).toBe(302);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(false);
    await prisma.user.deleteMany({ where: { email } });
  });

  it("redirects verified users to the absolute frontend callback", async () => {
    // Regression: relative callbackURLs resolve against the API origin
    // (:4000) and strand users there. The frontend always sends absolute
    // frontend URLs (see apps/web/lib/frontend-url.ts); the API must honor
    // them verbatim.
    const email = `landing-${Date.now()}@example.com`;
    await request(app).post("/api/auth/sign-up/email").set("Origin", ORIGIN).send({
      name: "Landing",
      email,
      password: "LandingTest123!",
    });
    const { token } = takeTestEmail(email, "verification");
    const res = await request(app)
      .get("/api/auth/verify-email")
      .query({ token, callbackURL: "http://localhost:3000/dashboard" });
    expect(res.status).toBe(302);
    expect(res.headers.location ?? "").toMatch(/^http:\/\/localhost:3000\/dashboard/);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);
    await prisma.user.deleteMany({ where: { email } });
  });
});

describe("password reset", () => {
  it("resets the password via emailed token; old password dies", async () => {
    const email = `reset-${Date.now()}@example.com`;
    const agent = request.agent(app);
    await agent.post("/api/auth/sign-up/email").set("Origin", ORIGIN).send({
      name: "Reset",
      email,
      password: "OldPassword123!",
    });
    // Verify first: only verified users reach the reset flow in tests.
    const { token: verifyToken } = takeTestEmail(email, "verification");
    await agent.get("/api/auth/verify-email").query({ token: verifyToken, callbackURL: "/" });

    const requested = await agent
      .post("/api/auth/request-password-reset")
      .set("Origin", ORIGIN)
      .send({ email, redirectTo: "/reset-password" });
    expect([200, 201]).toContain(requested.status);

    const { token: resetToken } = takeTestEmail(email, "reset");

    const reset = await agent
      .post("/api/auth/reset-password")
      .set("Origin", ORIGIN)
      .send({ newPassword: "NewPassword456!", token: resetToken });
    expect([200, 201]).toContain(reset.status);

    const fresh = request.agent(app);
    const oldLogin = await fresh
      .post("/api/auth/sign-in/email")
      .set("Origin", ORIGIN)
      .send({ email, password: "OldPassword123!" });
    expect(oldLogin.status).toBeGreaterThanOrEqual(400);

    const newLogin = await fresh
      .post("/api/auth/sign-in/email")
      .set("Origin", ORIGIN)
      .send({ email, password: "NewPassword456!" });
    expect(newLogin.status).toBe(200);

    const target = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.deleteMany({ where: { id: target.id } });
  });

  it("answers success for unknown emails (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/request-password-reset")
      .set("Origin", ORIGIN)
      .send({ email: `nobody-${Date.now()}@example.com`, redirectTo: "/reset-password" });
    expect([200, 201]).toContain(res.status);
  });

  it("rejects bogus reset tokens", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Origin", ORIGIN)
      .send({ newPassword: "NewPassword456!", token: "definitely-not-a-real-token" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
