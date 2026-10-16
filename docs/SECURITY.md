# Security Review — Phase 10, Step 3

Date: 2026-10-16. Method: code audit of `apps/api` + `apps/web` auth paths,
dependency audit (`npm audit`), and verification against better-auth docs.
Tests added: `apps/api/src/index.test.ts` (headers, both limiters).

## What was already in place (verified, not just claimed)

| Area | Status | Evidence |
|---|---|---|
| Ownership enforcement | ✅ | Every protected route scopes by `userId`; 404 (not 403) on foreign ids so ids are not oracles; covered by route tests |
| Input validation | ✅ | Zod on all bodies/params/queries via `validate*` middleware; `express.json({ limit: "1mb" })`; covered by `validation/schemas.test.ts` |
| Error envelope | ✅ | `{ ok:false, error: CODE }`; stacks never leave the server; covered by `middleware.test.ts` |
| Secrets handling | ✅ | `.env` git-ignored and untracked; `.env.example` documents every var; no secret in code or logs |
| Private storage | ✅ | Buckets must be private; browser uploads via presigned PUTs locked to declared Content-Type; downloads via 1h presigned GETs; keys namespaced `users/<id>/…`; sizes verified server-side at complete-time |
| Auth hardening | ✅ | better-auth: email verification required, 7-day sessions with 5-min cookie cache, Secure + httpOnly + lax cookies in production, built-in rate limiting in production (100/10s), no user enumeration on reset/duplicate signup; covered by `routes/auth.test.ts` |
| SQL injection | ✅ | Prisma only; the one raw-SQL builder (`timelineYearConditions`) uses parameterized `Prisma.sql` — no string interpolation |
| CORS | ✅ | Explicit allowlist from `WEB_ORIGIN` (comma-separated), `credentials: true`, never `*` |
| Runtime deps | ✅ | express 4.22.3 / qs 6.16.0 current with no advisories; top-level better-auth 1.7.7 is above the ≤1.6.21 advisory range |

## Findings implemented in this step

1. **No security headers** → added `helmet()` (hides `X-Powered-By`, nosniff, framing guards). JSON-only API, defaults are safe.
2. **No brute-force backstop beyond better-auth defaults** → added two `express-rate-limit` limiters with the project's error envelope (`RATE_LIMITED`): auth endpoints 100/15min per IP, general API 600/15min per IP. Health probes (`/api/health*`) are mounted before the limiter so monitors never 429. Tunable via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_API_MAX`.
3. **No `trust proxy`** → set `trust proxy, 1` (Render terminates TLS one hop away). Required so limiter keys are real client IPs, not the proxy's.
4. **`.env.example`** gained the three `RATE_LIMIT_*` knobs (no secrets).

## Residual risks (accepted, with owners)

- **Next.js 14 CVE (critical, prod runtime).** Fix requires the breaking Next 16 upgrade. Mitigations: stay on latest 14.2.x patches, deploy behind Vercel's managed edge, schedule the major upgrade as its own work item. Do not `npm audit fix --force` blindly.
- **tinypool/vite/esbuild CVEs (critical/high, dev-only).** Reachable only via local `vitest`/`next dev`/`next build`, never from deployed code. Same deferral: upgrade with the Vitest 5 / Next 16 majors.
- **`better-auth@1.4.22` nested under `@better-auth/cli` (critical advisory range).** Dev-only CLI dependency; the runtime copy is 1.7.7 (outside the range). Revisit on CLI upgrades.
- **In-memory rate-limit stores.** Correct for the planned single Render instance; a second instance would split buckets. If horizontally scaled, move limiter storage (and better-auth rate-limit storage) to shared storage.
- **No WAF / DDoS protection** beyond platform defaults; Render + Vercel absorb L3/L4, L7 abuse relies on the new limiters. Revisit if attacked.
- **`NODE_ENV=production` must be set on Render** — better-auth Secure cookies and its built-in limiter key off it. Added to the Step 7 deploy checklist.
