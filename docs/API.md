# Career Vault API Reference (Phase 3)

Base URL (dev): `http://localhost:4000`

## Auth (temporary — replaced in Phase 4)

Every protected route requires an `x-user-id` header with an existing User id.
Missing/unknown ids → `401 { ok:false, error:"UNAUTHENTICATED" }`.

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
