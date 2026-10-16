# Deploy Runbook — Phase 10, Step 7

Target: **Vercel** (web, `sin1`) + **Render** (API, Singapore) + **Neon**
Postgres + **Supabase Storage** + **Resend**. All free-tier friendly.
Config as code: `render.yaml` (API), `vercel.json` (web, repo root —
leave Vercel's Root Directory at the repository root).

## 0. Prerequisites (accounts + values to collect)

- Neon project (Singapore region) → **pooled** connection string with the
  `?sslmode=require&pgbouncer=true&connection_limit=1` suffix flags.
- Supabase project → private Storage bucket + S3 access keys
  (endpoint, region, key id, secret). Note the bucket CORS must allow PUT
  from the frontend origin (step 4).
- Resend account → API key + verified sending domain.
- Google/GitHub OAuth apps (optional) → client ids/secrets.
- JSearch key (optional; without it local job search answers 503 by design).

## 1. Deploy order (matters)

Database → API → web. The API's build step ends with `npm run db:deploy`
(`prisma migrate deploy`), so migrations run automatically on every Render
deploy, including the first — the database only needs to *exist* first.
(Build-time, not `preDeployCommand`: the latter is paywalled on Render's
free tier.)

## 2. Render (API)

1. Dashboard → New → Blueprint → select this repo (`render.yaml`).
2. Fill every `sync: false` variable in the Environment tab:
   `DATABASE_URL` (Neon pooled URL), `BETTER_AUTH_SECRET` (fresh random
   32+ bytes — generate with `openssl rand -base64 32`),
   `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `MyCareerArchive <mail@yourdomain>`),
   `SUPABASE_S3_*` (endpoint, region, key id, secret),
   OAuth ids/secrets (if used), `JSEARCH_API_KEY` (if used).
3. Replace the two TODO placeholders after URLs are known:
   `BETTER_AUTH_URL` → `https://<your-render-service>.onrender.com`,
   `WEB_ORIGIN` → `https://<your-vercel-app>.vercel.app`.
4. Deploy. Render runs build (ending with migrations) → start, then probes
   `GET /api/health`. First boot compiles slowly on free tier; give it minutes.
5. Free-tier note: services sleep after inactivity (cold starts ~30-60s).
   The Step 8 uptime ping doubles as a keep-warm.

`NODE_ENV=production` is set by the blueprint — required for Secure
cookies and better-auth's built-in rate limiter (see `docs/SECURITY.md`).

## 3. Vercel (web)

1. Import the repo. **Root Directory: repository root** (do not set
   `apps/web` — `vercel.json` already scopes the build/output).
2. Node version: 20.x. Framework preset: Next.js.
3. Environment variables (Production):
   - `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`
   - `NEXT_PUBLIC_SITE_URL=https://<your-vercel-app>.vercel.app`
4. Deploy. Every push to `master` redeploys (both platforms).

## 4. Post-deploy wiring (all three must match)

1. **OAuth redirect URIs** (if used) — register in Google/GitHub consoles:
   `https://<render>/api/auth/callback/google`,
   `https://<render>/api/auth/callback/github`.
2. **Storage CORS** — Supabase bucket must allow `PUT` from `WEB_ORIGIN`
   (the Vercel URL), else browser uploads fail at the preflight.
3. **Resend domain** — verify the sending domain; `EMAIL_FROM` must use it
   (the `onboarding@resend.dev` sender only works for your own test address).

## 5. Smoke test (production)

1. `GET https://<render>/api/health` → `ok:true`;
   `/api/health/db` → `db:"connected"`; `/api/docs` renders.
2. Register → verify email → log in → log out → log in (wrong password → 401).
3. Create credential → attach skill/tag/org → initiate + complete an
   evidence upload → credential detail shows it.
4. Resume build + portfolio build + interview prep return content.
5. Jobs search international works without a key; local needs `JSEARCH_API_KEY`.
6. Check Render logs: JSON lines with `requestId`; `X-Request-Id` present
   on responses; rate-limit headers present.

## 6. Rollback

- **API:** Render dashboard → Deploys → Roll Back (code only; migrations
  are forward-only — a reverted deploy does *not* undo schema changes;
  write a fix-forward migration instead).
- **Web:** Vercel → Deployments → Promote a previous deployment (instant).
- **DB:** restore per Step 9 backup strategy (Neon PITR / `pg_dump`).

## 7. Ongoing

- Pushes to `master` auto-deploy both apps after the `ci` check passes
  (enable branch protection per `.github/workflows/ci.yml` header).
- Secret rotation: update in Render/Vercel dashboards, redeploy.
  `BETTER_AUTH_SECRET` rotation invalidates all sessions (users re-login).
