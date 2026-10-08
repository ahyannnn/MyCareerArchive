import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { passwordResetEmail, sendEmail, verificationEmail } from "./lib/email.js";
import { prisma } from "./prisma.js";

type AuthOptions = NonNullable<Parameters<typeof betterAuth>[0]>;
type SocialProviders = NonNullable<AuthOptions["socialProviders"]>;

export interface TestEmail {
  type: "verification" | "reset";
  to: string;
  url: string;
  token: string;
}

// In-memory outbox for tests: records every auth email with its signed
// token so suites can click inbox links without a mail server. Populated
// ONLY under NODE_ENV=test (vitest sets this); production never retains it.
export const testEmailOutbox: TestEmail[] = [];

function recordForTests(entry: TestEmail) {
  if (process.env.NODE_ENV === "test") testEmailOutbox.push(entry);
}

export function takeTestEmail(to: string, type: TestEmail["type"]): TestEmail {
  const idx = testEmailOutbox.findIndex((e) => e.to === to && e.type === type);
  if (idx === -1) throw new Error(`No ${type} email recorded for ${to}`);
  return testEmailOutbox.splice(idx, 1)[0];
}

// OAuth providers activate purely from env vars: complete the Step-4
// homework (Google/GitHub OAuth apps), add the four credentials to .env,
// restart — no code change required. Email+password works standalone.
function resolveSocialProviders(): SocialProviders {
  const providers = {} as SocialProviders;
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  return providers;
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // The browser page (:3000) and API (:4000) are different origins, so the
  // API must explicitly trust the frontend origin for cookie flows.
  trustedOrigins: (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    // Strict mode: unverified users cannot log in. Note the side effect —
    // duplicate-email signup returns success (anti-enumeration) instead of
    // an error once this is on.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Fire-and-forget: never let mail latency/outages affect auth timing.
      recordForTests({ type: "reset", to: user.email, url, token });
      void sendEmail({ to: user.email, url, ...passwordResetEmail(url) });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
    sendVerificationEmail: async ({ user, url, token }) => {
      recordForTests({ type: "verification", to: user.email, url, token });
      void sendEmail({ to: user.email, url, ...verificationEmail(url) });
    },
  },
  socialProviders: resolveSocialProviders(),
  account: {
    accountLinking: {
      // Same verified email across methods collapses to one user.
      // Google and GitHub both verify emails, so they are safe to trust.
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // sliding refresh at most once a day
    // Fast path: the signed session+user payload rides in a cookie, so
    // get-session (and every userContext validation) skips the Neon Session
    // lookup on the hot path. The DB is still hit on refresh days and when
    // the cache cookie is absent/invalid. Tradeoff: server-side revocation
    // takes up to maxAge to propagate; logout clears cookies immediately.
    cookieCache: { enabled: true, maxAge: 60 * 5 }, // 5 minutes
  },
});

export type AuthSession = typeof auth.$Infer.Session;
