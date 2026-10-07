import { createAuthClient } from "better-auth/react";

// The auth server lives in Express, not Next.js, so the client must point
// at the API origin. Cookie sessions flow automatically on every call
// because the client sends `credentials: "include"` (same-site localhost
// in dev; see trustedOrigins + CORS on the API side).
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
});
