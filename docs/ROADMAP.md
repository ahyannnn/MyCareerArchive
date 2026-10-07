# MyCareerArchive Development Roadmap

## Project Status

Current Phase: Phase 5 — Evidence Storage (next up)
Current Milestone: Phases 1–4 complete, verified live (25 API tests green)

---

# Phase 1 — Foundation

- [x] Initialize repository
- [x] Set up monorepo (npm workspaces)
- [x] Set up Next.js frontend
- [x] Set up Express backend
- [x] Configure TypeScript
- [x] Configure PostgreSQL (Neon, Singapore region)
- [x] Configure Prisma
- [x] Configure environment variables
- [x] Create API health check (`/api/health`, `/api/health/db`)
- [x] Verify database connection (live: `db:connected`)
- [x] Run frontend successfully
- [x] Run backend successfully

## Phase 1 Completion Criteria

Phase 1 is complete only when:

1. Next.js starts successfully.
2. Express starts successfully.
3. Express can connect to PostgreSQL through Prisma.
4. `/api/health` returns a successful response.
5. No secrets are committed to Git.
6. The project builds without TypeScript errors.

---

# Phase 2 — Database

- [x] Create User model (+ Better Auth fields: emailVerified, image)
- [x] Create Credential model
- [x] Create Evidence model
- [x] Create Skill model
- [x] Create Tag model
- [x] Create Organization model
- [x] Create relationships (incl. Session/Account/Verification)
- [x] Create Prisma migration (init + auth_sessions, both applied to Neon)
- [x] Verify migration
- [x] Test database operations (via integration tests)

---

# Phase 3 — Backend

- [x] Express middleware
- [x] Error handling
- [x] Zod validation
- [x] Credential CRUD
- [x] Skills API
- [x] Tags API
- [x] Organizations API
- [x] Ownership authorization (scoped to user; real sessions since Phase 4)
- [x] API tests (25 integration tests green, incl. CORS preflight regression)

---

# Phase 4 — Authentication (Better Auth, Phase 4)

- [x] Registration (email+password; Google/GitHub wired, env-conditional)
- [x] Login (email+password + OAuth social sign-in)
- [x] Logout (session revoked, cookie cleared)
- [x] Session management (DB sessions, 7-day expiry, sliding refresh)
- [x] Protected routes (session middleware + ownership scoping)
- [x] User ownership checks (unchanged — now fed by real sessions)
- [x] OAuth app credentials in .env (Google + GitHub configured; provider URLs verified live)
- [x] Email verification (Resend; strict gate — unverified login blocked)
- [x] Password reset (emailed token; old password invalidated)

---

# Phase 5 — Evidence Storage

- [x] S3-compatible storage client (private bucket, presigned URLs; R2 kept as fallback driver)
- [x] Supabase Storage via S3 protocol (free tier, no card) — active driver (`STORAGE_DRIVER=supabase`)
- [x] Upload evidence (initiate → browser PUT → complete; API never sees bytes)
- [x] Store file metadata (Evidence rows: PENDING → UPLOADED/FAILED)
- [x] Generate signed URLs (PUT locked to Content-Type, 15 min; GET downloads, 1 h)
- [x] Delete evidence (storage object + row, idempotent)
- [x] File validation (broad MIME allowlist: images, PDF, office docs, text, archives)
- [x] File size limits (env-configurable, default 25 MB; declared size checked upfront, real size verified via HeadObject)
- [x] Supabase bucket + S3 keys in .env (private `evidence` bucket, S3 endpoint/region/keys; verified presign + head live)

---

# Phase 6 — Frontend

- [x] Login page (basic version shipped in Phase 4; full UX here)
- [x] Register page (basic version shipped in Phase 4; full UX here)
- [x] Dashboard (stat cards, recent credentials, Quick Add, empty vault state)
- [x] Design system (CSS-variable tokens, owned ui/ primitives, app shell + toasts)
- [x] Credential list (search, type/year/skill/tag/org filters, sort, pagination)
- [x] Create credential (shared form: type/date/org/skills/tags, inline create)
- [x] Credential details (description-list sections, skill/tag badges, links & org)
- [x] Edit credential (prefilled form, replace semantics for skills/tags)
- [x] Evidence viewer (status badges, download links, delete with confirm, dropzone uploader driving initiate → PUT → complete)

---

# Phase 7 — Search

- [x] Search credentials (API-level: title/description/org/skills/tags; UI in Phase 6)
- [x] Filter by type (API-level; UI in Phase 6)
- [x] Filter by year (API-level; UI in Phase 6)
- [x] Filter by skill (API-level; UI in Phase 6)
- [x] Filter by tag (API-level; UI in Phase 6)
- [x] Filter by organization (API-level; UI in Phase 6)
- [x] Sorting (API-level; UI in Phase 6)

---

# Phase 8 — Career Features

- [ ] Timeline
- [ ] Career profile
- [ ] Skill history
- [ ] Resume builder
- [ ] Portfolio project generation

---

# Phase 9 — AI

- [ ] AI career search
- [ ] Resume bullet generation
- [ ] Portfolio description generation
- [ ] Job matching
- [ ] Interview preparation

---

# Phase 10 — Production

- [ ] Unit tests
- [ ] API tests
- [ ] Security review
- [ ] OpenAPI documentation
- [ ] GitHub Actions
- [ ] Deployment
- [ ] Logging
- [ ] Monitoring
- [ ] Backup strategy