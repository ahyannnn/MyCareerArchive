import { createAuthClient } from "better-auth/react";

// The auth server lives in Express, not Next.js, so the client must point
// at the API origin. Cookie sessions flow automatically on every call
// because the client sends `credentials: "include"` (same-site localhost
// in dev; see trustedOrigins + CORS on the API side).
// Use a relative base so auth requests go through the Next.js /api proxy and
// cookies stay first-party (works in both dev and production).
const apiUrl = "";
export const authClient = createAuthClient({
  baseURL: apiUrl,
});
