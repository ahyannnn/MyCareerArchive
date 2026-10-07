import type { Express } from "express";
import request from "supertest";
import { takeTestEmail } from "../auth.js";
import { prisma } from "../prisma.js";

// Integration tests run against the real database (Neon dev project) with
// REAL auth flows: each suite registers throwaway users through
// POST /api/auth/sign-up/email and drives requests with a cookie-preserving
// supertest agent — the same session-cookie mechanism browsers use.
// afterAll removes the users; User relations are onDelete:Cascade
// (credentials, skills, tags, orgs, sessions, accounts) so nothing lingers.
export interface TestAgent {
  agent: ReturnType<typeof request.agent>;
  userId: string;
  email: string;
  password: string;
}

const TEST_PASSWORD = "Phase4Test123!";

export async function createTestAgent(app: Express, suite: string): Promise<TestAgent> {
  const rand = Math.floor(Math.random() * 1e6);
  const email = `phase4-${suite}-${Date.now()}-${rand}@example.com`;
  const agent = request.agent(app);
  const signup = await agent
    .post("/api/auth/sign-up/email")
    .set("Origin", "http://localhost:3000")
    .send({ name: `Phase4 ${suite}`, email, password: TEST_PASSWORD });
  if (signup.status !== 200 && signup.status !== 201) {
    throw new Error(`Test signup failed (${signup.status}): ${JSON.stringify(signup.body).slice(0, 300)}`);
  }
  // Strict verification gate: complete the inbox flow programmatically,
  // exactly as a user clicking the email link would.
  await verifyTestEmail(agent, email);
  const signin = await agent
    .post("/api/auth/sign-in/email")
    .set("Origin", "http://localhost:3000")
    .send({ email, password: TEST_PASSWORD });
  if (signin.status !== 200) {
    throw new Error(`Test sign-in failed (${signin.status}): ${JSON.stringify(signin.body).slice(0, 300)}`);
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { agent, userId: user.id, email, password: TEST_PASSWORD };
}

// Newest Verification row mentioning this email (password-reset tokens
// share the table; callers act immediately after triggering, so
// newest-first is unambiguous in tests).
export async function latestVerificationFor(email: string) {
  return prisma.verification.findFirst({
    where: { identifier: { contains: email } },
    orderBy: { createdAt: "desc" },
  });
}

// Simulates clicking the inbox link: the token is a stateless signed JWT
// captured from the test outbox (email-verification tokens are NOT stored
// in the database). Validating it flips User.emailVerified (and
// auto-signs-in when configured).
export async function verifyTestEmail(
  agent: ReturnType<typeof request.agent>,
  email: string,
): Promise<void> {
  const { token } = takeTestEmail(email, "verification");
  await agent.get("/api/auth/verify-email").query({ token, callbackURL: "/" });
}

export async function deleteTestUser(id: string) {
  await prisma.user.deleteMany({ where: { id } });
}
