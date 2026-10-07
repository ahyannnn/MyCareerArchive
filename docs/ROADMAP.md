# Career Vault Development Roadmap

## Project Status

Current Phase: Phase 1
Current Milestone: Project Foundation

---

# Phase 1 — Foundation

- [ ] Initialize repository
- [ ] Set up monorepo
- [ ] Set up Next.js frontend
- [ ] Set up Express backend
- [ ] Configure TypeScript
- [ ] Configure PostgreSQL
- [ ] Configure Prisma
- [ ] Configure environment variables
- [ ] Create API health check
- [ ] Verify database connection
- [ ] Run frontend successfully
- [ ] Run backend successfully

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

- [ ] Create User model
- [ ] Create Credential model
- [ ] Create Evidence model
- [ ] Create Skill model
- [ ] Create Tag model
- [ ] Create Organization model
- [ ] Create relationships
- [ ] Create Prisma migration
- [ ] Verify migration
- [ ] Test database operations

---

# Phase 3 — Backend

- [x] Express middleware
- [x] Error handling
- [x] Zod validation
- [x] Credential CRUD
- [x] Skills API
- [x] Tags API
- [x] Organizations API
- [x] Ownership authorization (scoped to user; auth header is a dev stand-in until Phase 4)
- [x] API tests (19 integration tests green)

---

# Phase 4 — Authentication

- [ ] Registration
- [ ] Login
- [ ] Logout
- [ ] Session management
- [ ] Protected routes
- [ ] User ownership checks

---

# Phase 5 — Evidence Storage

- [ ] Cloudflare R2
- [ ] Upload evidence
- [ ] Store file metadata
- [ ] Generate signed URLs
- [ ] Delete evidence
- [ ] File validation
- [ ] File size limits

---

# Phase 6 — Frontend

- [ ] Login page
- [ ] Register page
- [ ] Dashboard
- [ ] Credential list
- [ ] Create credential
- [ ] Credential details
- [ ] Edit credential
- [ ] Evidence viewer

---

# Phase 7 — Search

- [ ] Search credentials
- [ ] Filter by type
- [ ] Filter by year
- [ ] Filter by skill
- [ ] Filter by tag
- [ ] Filter by organization
- [ ] Sorting

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