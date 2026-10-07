# MyCareerArchive API Reference (Phase 4)

Base URL (dev): `http://localhost:4000`

## Auth (Better Auth session cookies)

All `/api/auth/*` routes are served by Better Auth mounted before
`express.json()`. The browser holds an `httpOnly` session cookie;
every protected route resolves the user from it (401 when missing/expired).

```http
POST /api/auth/sign-up/email      { name*, email*, password* (min 8) }
POST /api/auth/sign-in/email      { email*, password* }
POST /api/auth/sign-out
GET  /api/auth/get-session
POST /api/auth/sign-in/social     { provider: "google" | "github", callbackURL? }
GET  /api/auth/verify-email?token=&callbackURL=
POST /api/auth/send-verification-email   { email*, callbackURL? }
POST /api/auth/request-password-reset    { email*, redirectTo? }
POST /api/auth/reset-password            { newPassword*, token* }
```

## Evidence (S3 presigned flow; bytes never touch the API)

```http
POST   /api/credentials/:id/evidence/initiate   { fileName*, mimeType*, fileSize* }
POST   /api/evidence/:id/complete
GET    /api/credentials/:id/evidence
GET    /api/evidence/:id/url
DELETE /api/evidence/:id
```

- Initiate validates type/size, creates a `PENDING` row, and returns
  `{ evidence, uploadUrl, expiresIn }`. Browser PUTs bytes direct to storage
  (`STORAGE_DRIVER=r2` for Cloudflare R2, `supabase` for Supabase Storage
  via its S3 protocol — same presigned-URL flow, private bucket).
- Complete verifies via `HeadObject`: missing file → `404 FILE_NOT_UPLOADED`
  (row marked `FAILED`); oversize reality → object deleted, `400 FILE_TOO_LARGE`.
  Stored `fileSize` is always the real size, and completing is idempotent.
- Download URLs are presigned (private bucket, 1 h); `PENDING` rows are not
  downloadable. Ownership resolves through the credential on every route.
- Without the active driver's env vars (`R2_*` or `SUPABASE_S3_*`),
  storage routes answer `503 STORAGE_UNCONFIGURED`
  and everything else works normally.

- Email+password always enabled (open registration).
- Google/GitHub activate purely from env (`GOOGLE_CLIENT_ID/SECRET`,
  `GITHUB_CLIENT_ID/SECRET`); same verified email across methods links to
  one user (`trustedProviders: ["google", "github"]`).
- Email verification is STRICT: signup grants no session; the inbox link
  (`/verify-email`, 1-hour JWT, stateless — not a DB row) flips
  `emailVerified` and auto-signs-in. Unverified sign-in is blocked.
- `callbackURL`/`redirectTo` MUST be absolute frontend URLs
  (`https://app…/dashboard`, never `/dashboard`): the API redirects to the
  value verbatim, so relative paths strand users on the API origin.
  The web app builds them via `lib/frontend-url.ts`.
- Password reset never leaks account existence (unknown emails also get
  success). Email delivery via Resend (`RESEND_API_KEY`); without a key
  the API logs the link instead of sending (dev/test fallback).
- Sessions: 7-day expiry, sliding refresh daily, stored in Postgres
  (`Session`/`Account`/`Verification` tables).
- CORS: web origin only + `credentials`. Frontend sends cookies automatically.

## Envelopes

- Success: `{ ok: true, data, meta? }` (`meta: { page, pageSize, total }` on lists)
- Failure: `{ ok: false, error: CODE, message?, details? }`
- Codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `NOT_FOUND` (404),
  `CONFLICT` (409, e.g. duplicate skill/tag name), `INTERNAL_ERROR` (500)

## Health (public)

```http
GET /api/health
GET /api/health/db
```

## Credentials

```http
POST   /api/credentials
GET    /api/credentials?search=&type=&skill=&tag=&organizationId=&year=&sort=date-desc&page=&pageSize=
GET    /api/credentials/:id
PATCH  /api/credentials/:id
DELETE /api/credentials/:id
```

Body: `title*`, `description?`, `type?` (PROJECT|CERTIFICATE|SEMINAR|TRAINING|
AWARD|COMPETITION|INTERNSHIP|ORGANIZATION|VOLUNTEER|OTHER, default OTHER),
`organizationId?|null`, `date?|null` (ISO-8601), `location?`, `url?|null`,
`skillIds?[]`, `tagIds?[]`. On PATCH, `skillIds`/`tagIds` replace links when
present and are untouched when omitted.

## Skills

```http
GET    /api/skills?search=
POST   /api/skills            { name* }
PATCH  /api/skills/:id        { name* }
DELETE /api/skills/:id
```

Names are unique per user. Responses include `credentialCount`.

## Tags

```http
GET    /api/tags?search=
POST   /api/tags              { name* }
DELETE /api/tags/:id
```

No update endpoint by design (rename by recreate). Responses include `credentialCount`.

## Organizations

```http
GET    /api/organizations?search=
POST   /api/organizations     { name*, website?, description? }
PATCH  /api/organizations/:id
DELETE /api/organizations/:id
```

Deleting an organization keeps credential history (`organizationId` → null).

## Ownership

Every query is scoped to the requesting user; cross-user ids behave as `404`,
never `403`, so ids are not guessable oracles.
