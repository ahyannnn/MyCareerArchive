# MyCareerArchive — Project Context

## 1. Project Overview

I am building a full-stack web application called **MyCareerArchive** that acts as a **personal career archive**.

The problem I want to solve is that when creating a resume, portfolio, job application, or other professional documents, it is difficult to remember and locate old projects, certificates, seminars, awards, photos, screenshots, messages, documents, links, and other evidence from previous experiences.

The application should allow a user to continuously save these experiences and their supporting evidence so that years later they can easily search, review, and reuse them.

The core idea is:

> **Never lose track of something I accomplished or the evidence behind it.**

This should not just be a certificate-storage application. It should become a **personal career evidence system**.

Think of it as a combination of:

* Personal archive
* Digital scrapbook
* Credential manager
* Career database
* Evidence repository
* Portfolio source
* Eventually, resume/portfolio generation system

---

# 2. Main Product Concept

Each important experience is represented as a **Credential/Experience record**.

Examples:

* Project
* Certificate
* Seminar
* Training
* Award
* Competition
* Internship
* Organization involvement
* Volunteer experience
* Achievement
* Other significant experience

A credential can contain supporting evidence such as:

* Certificate PDFs
* Photos
* Screenshots
* Project screenshots
* Documents
* Messages
* Links
* Notes
* Event information
* Organization
* People involved
* Skills used
* Technologies
* Dates
* Reflections
* Other files

Example:

## SOLARIS — Solar Pre-Assessment System

Type:
`PROJECT`

Year:
`2026`

Description:
A web-based solar site pre-assessment system developed as a capstone project.

Skills:

* Node.js
* Express.js
* React
* PostgreSQL
* REST API

Evidence:

* Project screenshots
* Documentation
* Demo link
* Photos
* Capstone documents
* Presentation screenshots

The goal is to preserve both the **credential itself and the context/evidence surrounding it**.

---

# 3. Long-Term Vision

Eventually, the application should become a personal career intelligence system.

The stored information can later be used to generate:

* Resume content
* Resume bullet points
* Portfolio project descriptions
* Portfolio pages
* Cover letters
* Job-specific experience recommendations
* Skill summaries
* Career timelines
* Interview preparation
* Job matching
* AI-powered career search

For example:

User selects:

`Backend Developer`

The system searches the user's stored experiences and finds relevant records containing:

* Node.js
* Express
* REST APIs
* PostgreSQL
* Backend development
* Database design

It can then recommend:

* SOLARIS
* Booking/Billing System
* Backend projects
* Relevant certificates
* Relevant seminars

However:

**Do NOT build the AI features first.**

The foundation should be a reliable structured career/evidence database.

---

# 4. MVP Goal

The MVP should solve one problem extremely well:

> **Store and retrieve everything related to my past and future experiences.**

The MVP should support:

### Authentication

* Register
* Login
* Logout
* Session management
* Protected routes

### Credentials

* Create
* Read
* Update
* Delete
* View details
* Categorize

Credential types should initially include:

* PROJECT
* CERTIFICATE
* SEMINAR
* TRAINING
* AWARD
* COMPETITION
* INTERNSHIP
* ORGANIZATION
* VOLUNTEER
* OTHER

### Evidence

A credential can have multiple evidence items.

Examples:

* Images
* PDFs
* Screenshots
* Documents
* Other files
* External links

### Organization

Credentials may belong to an organization/company/school/event organizer.

### Skills

Credentials can be associated with multiple skills.

Example:

SOLARIS →

* Node.js
* Express.js
* React
* PostgreSQL
* REST API

### Tags

Tags are separate from skills.

Examples:

* capstone
* school
* important
* portfolio
* 2026
* team-project

### Search

Search across:

* Credential title
* Description
* Organization
* Skills
* Tags

### Filtering

Filter by:

* Credential type
* Date/year
* Skill
* Tag
* Organization

### Timeline

Display experiences chronologically.

---

# 5. Recommended Technology Stack

Use a production-oriented TypeScript stack.

## Frontend

* Next.js
* TypeScript
* Tailwind CSS

## Backend

* Node.js
* Express.js
* TypeScript
* Zod for request validation

## Database

* PostgreSQL
* Prisma ORM

## File Storage

* Cloudflare R2

Do NOT store uploaded images/PDFs directly inside PostgreSQL.

PostgreSQL should store metadata and references to files.

## Authentication

Use a mature authentication solution/library instead of implementing password/session security manually.

The exact authentication library can be selected based on current project compatibility.

## Testing

* Vitest
* Supertest

## API Documentation

* OpenAPI/Swagger

## CI/CD

* GitHub Actions

---

# 6. High-Level Architecture

Target architecture:

```text
                         USER
                          |
                          v
                  +---------------+
                  |    Next.js    |
                  |   Frontend    |
                  +-------+-------+
                          |
                       HTTPS
                          |
                          v
                  +---------------+
                  |    Express    |
                  |    REST API   |
                  +-------+-------+
                          |
              +-----------+------------+
              |                        |
              v                        v
       +-------------+          +-------------+
       | PostgreSQL  |          | Cloudflare  |
       |   Prisma    |          |     R2      |
       +-------------+          +-------------+
              |                        |
              |                        |
              v                        v
       Structured data          Actual files
       and metadata             and evidence
```

Future:

```text
                  MyCareerArchive
                          |
               +---------+---------+
               |                   |
               v                   v
          Structured data       Evidence
               |                   |
               +---------+---------+
                         |
                         v
                    Search Layer
                         |
                         v
                     AI Layer
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
       Resume        Portfolio       Job Matching
```

---

# 7. Project Structure

Prefer a monorepo:

```text
mycareerarchive/
│
├── apps/
│   ├── web/
│   │   └── Next.js application
│   │
│   └── api/
│       └── Express API
│
├── packages/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── prisma/
│   └── schema.prisma
│
├── package.json
├── README.md
└── .env
```

The exact folder structure can be adjusted if there is a better industry-standard approach, but keep frontend and backend clearly separated.

---

# 8. Database Concept

Initial conceptual data model:

```text
USER
 |
 +---- CREDENTIAL
 |       |
 |       +---- EVIDENCE
 |       |
 |       +---- CREDENTIAL_SKILL ---- SKILL
 |       |
 |       +---- CREDENTIAL_TAG ----- TAG
 |       |
 |       +---- ORGANIZATION
 |
 +---- SKILLS
 |
 +---- TAGS
 |
 +---- ORGANIZATIONS
```

## User

Suggested fields:

* id
* email
* name
* avatar
* createdAt
* updatedAt

## Credential

Suggested fields:

* id
* userId
* title
* description
* type
* organizationId
* date
* location
* url
* createdAt
* updatedAt

## Evidence

Suggested fields:

* id
* credentialId
* fileName
* fileType
* mimeType
* fileSize
* storageKey
* createdAt

## Skill

Suggested fields:

* id
* userId
* name
* createdAt

## Tag

Suggested fields:

* id
* userId
* name
* createdAt

## Organization

Suggested fields:

* id
* userId
* name
* website
* description
* createdAt
* updatedAt

Use many-to-many relationships where appropriate.

For example:

```text
Credential <-> Skill
Credential <-> Tag
```

---

# 9. File Storage Architecture

Do not store actual files in PostgreSQL.

Use:

```text
Browser
   |
   +-------------> Cloudflare R2
   |                    |
   |                    +---- actual file
   |
   +-------------> Express API
                         |
                         +---- file metadata
                              |
                              v
                         PostgreSQL
```

Example database record:

```text
Evidence
-----------------------------
id: 382
credentialId: 12
fileName: certificate.pdf
storageKey: users/123/evidence/382.pdf
mimeType: application/pdf
fileSize: ...
```

R2:

```text
users/
└── 123/
    └── evidence/
        └── 382.pdf
```

Use signed/temporary URLs for private files.

Do not make the entire storage bucket publicly accessible.

---

# 10. Backend API

Initial REST endpoints:

## Credentials

```http
POST   /api/credentials
GET    /api/credentials
GET    /api/credentials/:id
PATCH  /api/credentials/:id
DELETE /api/credentials/:id
```

## Evidence

```http
POST   /api/credentials/:id/evidence
GET    /api/credentials/:id/evidence
DELETE /api/evidence/:id
GET    /api/evidence/:id/url
```

## Skills

```http
GET    /api/skills
POST   /api/skills
PATCH  /api/skills/:id
DELETE /api/skills/:id
```

## Tags

```http
GET    /api/tags
POST   /api/tags
DELETE /api/tags/:id
```

## Organizations

```http
GET    /api/organizations
POST   /api/organizations
PATCH  /api/organizations/:id
DELETE /api/organizations/:id
```

The API should have:

* Authentication middleware
* Authorization/ownership checks
* Input validation
* Centralized error handling
* Consistent API response format
* Logging
* Proper HTTP status codes

---

# 11. Important Security Requirement

Never rely on the frontend to determine ownership.

Every protected resource must verify that the authenticated user owns it.

For example:

```text
Request
   |
   v
Authentication
   |
   v
Authenticated user ID
   |
   v
Credential lookup
   |
   v
credential.userId === authenticatedUser.id
   |
   +---- YES -> continue
   |
   +---- NO  -> 403/404
```

This applies to:

* Credentials
* Evidence
* Skills
* Tags
* Organizations
* File URLs

---

# 12. Frontend Pages

Initial pages:

```text
/login
/register

/dashboard

/credentials
/credentials/new
/credentials/[id]
/credentials/[id]/edit

/settings
```

Dashboard should show:

* Total credentials
* Number of projects
* Number of certificates
* Number of seminars
* Recent credentials
* Search
* Filters
* Quick Add button

---

# 13. Credential Detail Page

The credential detail page is very important.

Example:

```text
------------------------------------------------
← Back

SOLARIS
Solar Pre-Assessment System

PROJECT · 2026

------------------------------------------------

Description

A web-based solar site pre-assessment system
developed as a capstone project.

------------------------------------------------

Skills

[Node.js] [Express.js] [React]
[PostgreSQL] [REST API]

------------------------------------------------

Evidence

[ Screenshot ] [ Documentation ] [ Photo ]

------------------------------------------------

Links

GitHub
Live Demo

------------------------------------------------

Organization

...

------------------------------------------------

Notes

...

------------------------------------------------
```

The purpose is to create a **single source of truth for each accomplishment**.

---

# 14. Quick Capture Feature

A future but important feature:

The user should be able to quickly save an experience immediately after it happens.

Example:

```text
What did you just accomplish?

[ Web Development Seminar ]

Date:
[ October 6, 2026 ]

Organization:
[ ABC Tech ]

Skills:
[ Node.js ] [ APIs ]

Evidence:
[ Upload Photo ]
[ Upload Certificate ]
[ Add Screenshot ]

Notes:
[ ... ]

SAVE
```

The goal is to minimize the chance of forgetting important context.

---

# 15. Search

Initially use PostgreSQL search rather than introducing Elasticsearch/OpenSearch.

Search should eventually support:

```text
Search:
"backend"
```

and find records through:

* title
* description
* organization
* skills
* tags

Filters:

```text
Type:
[All] [Project] [Certificate] [Seminar]

Year:
[2024] [2025] [2026]

Skill:
[Node.js]

Tag:
[portfolio]
```

Later, PostgreSQL full-text search or another dedicated search engine can be added if needed.

---

# 16. Timeline

Add a chronological career timeline:

```text
2024
 |
 +-- JavaScript Certificate
 +-- Web Development Seminar
 |
2025
 |
 +-- Booking System
 +-- Backend Certificate
 +-- Hackathon
 |
2026
 |
 +-- SOLARIS
 +-- Internship
 +-- Other projects
```

---

# 17. Career Profile

Eventually calculate useful career information from the stored records.

For example:

```text
Node.js
Used in 5 experiences

React
Used in 4 experiences

PostgreSQL
Used in 3 experiences

Express
Used in 3 experiences
```

Do NOT initially represent this as an artificial "85% proficiency" score.

It should represent actual evidence from the user's stored experiences.

---

# 18. Future Resume Builder

After the core system is stable:

```text
Resume Builder
       |
       v
Target Role
"Backend Developer"
       |
       v
Search stored experiences
       |
       +---- SOLARIS
       +---- Booking System
       +---- REST API Project
       +---- Backend Certificate
       |
       v
Generate resume content
```

The system should use actual stored evidence rather than inventing experience.

---

# 19. Future AI Features

AI should come after the structured database is working.

Potential features:

### AI Career Search

User:

> "Show me everything I've done involving backend development."

System retrieves relevant credentials.

### Resume Bullet Generator

User selects a project.

AI creates concise resume bullets based only on stored information.

### Portfolio Description Generator

Convert a credential into a polished portfolio project description.

### Job Matching

User provides a job description.

System compares the requirements with stored:

* Skills
* Projects
* Certificates
* Experiences

and identifies relevant evidence.

### Interview Preparation

Generate interview questions based on the user's actual projects.

---

# 20. Development Roadmap

Build in this exact general order.

## Phase 1 — Foundation

```text
[ ] Git repository
[ ] Monorepo
[ ] Next.js
[ ] Express
[ ] TypeScript
[ ] PostgreSQL
[ ] Prisma
[ ] Environment configuration
```

## Phase 2 — Database

```text
[ ] User
[ ] Credential
[ ] Evidence
[ ] Skill
[ ] Tag
[ ] Organization
[ ] Relationships
[ ] Prisma migrations
```

## Phase 3 — Backend

```text
[ ] Express server
[ ] Middleware
[ ] Error handling
[ ] Validation
[ ] Credential CRUD
[ ] Skills API
[ ] Tags API
[ ] Organizations API
```

## Phase 4 — Authentication

```text
[ ] Registration
[ ] Login
[ ] Logout
[ ] Session management
[ ] Protected API routes
[ ] Ownership checks
```

## Phase 5 — File Storage

```text
[ ] Cloudflare R2
[ ] Upload
[ ] Delete
[ ] File metadata
[ ] Signed URLs
[ ] File validation
```

## Phase 6 — Frontend

```text
[ ] Login
[ ] Register
[ ] Dashboard
[ ] Credential list
[ ] Credential creation
[ ] Credential details
[ ] Credential editing
[ ] Evidence viewer
```

## Phase 7 — Search

```text
[ ] Search
[ ] Filters
[ ] Tags
[ ] Skills
[ ] Date filtering
[ ] Sorting
```

## Phase 8 — Career Features

```text
[ ] Timeline
[ ] Skill history
[ ] Career profile
[ ] Resume builder
```

## Phase 9 — AI

```text
[ ] AI career search
[ ] Resume bullet generation
[ ] Portfolio descriptions
[ ] Job matching
[ ] Interview preparation
```

## Phase 10 — Production

```text
[ ] Unit tests
[ ] API tests
[ ] Security review
[ ] API documentation
[ ] GitHub Actions
[ ] Deployment
[ ] Logging
[ ] Monitoring
[ ] Database backups
```

---

# 21. Development Philosophy

Do not build the entire application at once.

Work incrementally.

The first meaningful milestone is:

> **A user can authenticate, create a credential through the API, store it in PostgreSQL, retrieve it, and associate evidence with it.**

Then build the UI on top of the working API.

Prefer:

```text
Small feature
    ↓
Implement
    ↓
Test
    ↓
Commit
    ↓
Next feature
```

rather than trying to generate the whole application in one step.

---

# 22. Current First Task

Start with **Phase 1 only**.

Before implementing advanced features:

1. Inspect the current repository.
2. Determine whether a project already exists.
3. If empty, initialize the project.
4. Set up the monorepo.
5. Create the Next.js frontend.
6. Create the Express + TypeScript backend.
7. Set up PostgreSQL.
8. Set up Prisma.
9. Configure environment variables.
10. Verify that:

* Next.js runs
* Express runs
* Express can connect to PostgreSQL through Prisma
* A basic health-check endpoint works

11. Do not implement authentication, file uploads, AI, or the complete UI yet.

After Phase 1 is verified, move to the database schema and migration.

---

# 23. Important Implementation Principles

* Use TypeScript throughout.
* Keep frontend and backend concerns separated.
* Keep business logic out of route handlers when possible.
* Use services/use-cases for business logic.
* Validate external input with Zod.
* Use Prisma for database access.
* Do not expose database internals directly to the client.
* Do not store files in PostgreSQL.
* Do not expose private R2 buckets publicly.
* Use signed URLs for private evidence.
* Enforce resource ownership server-side.
* Use environment variables for secrets.
* Never commit secrets.
* Keep APIs documented.
* Write tests for important business logic.
* Use migrations for database changes.
* Keep commits small and descriptive.
* Do not add unnecessary infrastructure prematurely.
* Avoid microservices for the initial version.
* Keep the initial architecture as a modular monolith.

---

# 24. Architecture Philosophy

The initial backend should be a **modular monolith**, not microservices.

Use:

```text
Next.js
   |
Express API
   |
Modules
   ├── Auth
   ├── Credentials
   ├── Evidence
   ├── Skills
   ├── Tags
   └── Organizations
   |
PostgreSQL
   +
Cloudflare R2
```

Do not introduce:

* Kubernetes
* Redis
* Kafka
* Microservices
* Elasticsearch
* Complex event buses

unless there is an actual requirement for them.

The application should be easy to understand, maintain, test, and deploy.

---

# 25. Product Principle

The most important product principle is:

> **Capture evidence now so your future self doesn't have to reconstruct your career history later.**

The application should optimize for **preserving context**, not merely storing certificates.

A credential without context is:

```text
"Web Development Seminar"
```

A useful career record is:

```text
Web Development Seminar
2025
ABC Organization

What happened:
Attended backend/web development seminar.

Skills:
Node.js
REST APIs
Backend Development

Evidence:
Certificate
Event photo
Screenshot
Notes

What I learned:
...

People:
...

Related projects:
...

Can be used for:
Resume
Portfolio
Job application
```

That distinction should guide the product and database design.
