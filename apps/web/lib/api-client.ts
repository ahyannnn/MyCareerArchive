"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

// DTOs mirror apps/api/src/lib/serialize.ts. Keep in sync manually — the
// API never leaks join rows or foreign keys, only these shapes.
export type CredentialType =
  | "PROJECT"
  | "CERTIFICATE"
  | "SEMINAR"
  | "TRAINING"
  | "AWARD"
  | "COMPETITION"
  | "INTERNSHIP"
  | "ORGANIZATION"
  | "VOLUNTEER"
  | "OTHER";

export const CREDENTIAL_TYPES: readonly CredentialType[] = [
  "PROJECT",
  "CERTIFICATE",
  "SEMINAR",
  "TRAINING",
  "AWARD",
  "COMPETITION",
  "INTERNSHIP",
  "ORGANIZATION",
  "VOLUNTEER",
  "OTHER",
];

export interface CredentialSummary {
  id: string;
  title: string;
  description: string | null;
  type: CredentialType;
  date: string | null;
  location: string | null;
  url: string | null;
  organization: { id: string; name: string; website: string | null } | null;
  skills: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialList {
  ok: boolean;
  data: CredentialSummary[];
  meta: { page: number; pageSize: number; total: number };
}

export interface NamedRef {
  id: string;
  name: string;
  credentialCount?: number;
}

export interface OrganizationRef extends NamedRef {
  website: string | null;
  description: string | null;
}

export type EvidenceStatus = "PENDING" | "UPLOADED" | "FAILED";

export interface EvidenceItem {
  id: string;
  credentialId: string;
  fileName: string;
  fileType: string | null;
  mimeType: string | null;
  fileSize: number | null;
  status: EvidenceStatus;
  createdAt: string;
}

export interface CredentialQuery {
  search?: string;
  type?: string;
  skill?: string;
  tag?: string;
  organizationId?: string;
  year?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCredentialInput {
  title: string;
  description?: string;
  type?: CredentialType;
  organizationId?: string | null;
  date?: string | null;
  location?: string;
  url?: string | null;
  skillIds?: string[];
  tagIds?: string[];
}

export type UpdateCredentialInput = Partial<
  Omit<CreateCredentialInput, "description" | "date" | "location" | "url" | "organizationId">
> & {
  description?: string | null;
  date?: string | null;
  location?: string | null;
  url?: string | null;
  organizationId?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: T;
    error?: string;
    message?: string;
  } | null;
  if (!res.ok || !body || body.ok === false) {
    throw new ApiError(res.status, body?.error ?? "REQUEST_FAILED", body?.message);
  }
  return (body.data ?? undefined) as T;
}

function toQuery(q: CredentialQuery): string {
  const params = new URLSearchParams();
  if (q.search) params.set("search", q.search);
  if (q.type) params.set("type", q.type);
  if (q.skill) params.set("skill", q.skill);
  if (q.tag) params.set("tag", q.tag);
  if (q.organizationId) params.set("organizationId", q.organizationId);
  if (q.year) params.set("year", String(q.year));
  if (q.sort) params.set("sort", q.sort);
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const credentialsApi = {
  // NOTE: unlike every other list endpoint, GET /api/credentials returns
  // `meta` as a sibling of `data` ({ ok, data, meta }), so it needs the
  // full envelope — the generic request() unwrap (body.data only) drops it.
  async list(q: CredentialQuery): Promise<CredentialList> {
    const res = await fetch(`${API}/api/credentials${toQuery(q)}`, {
      credentials: "include",
      method: "GET",
    });
    const body = (await res.json().catch(() => null)) as CredentialList & {
      ok?: boolean;
      error?: string;
      message?: string;
    };
    if (!res.ok || !body || body.ok === false || !Array.isArray(body.data) || !body.meta) {
      throw new ApiError(
        res.status,
        (body as { error?: string })?.error ?? "REQUEST_FAILED",
        (body as { message?: string })?.message,
      );
    }
    return { ok: true, data: body.data, meta: body.meta };
  },
  get(id: string): Promise<CredentialSummary> {
    return request<CredentialSummary>(`/api/credentials/${id}`, { method: "GET" });
  },
  create(input: CreateCredentialInput): Promise<CredentialSummary> {
    return request<CredentialSummary>("/api/credentials", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  update(id: string, input: UpdateCredentialInput): Promise<CredentialSummary> {
    return request<CredentialSummary>(`/api/credentials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  remove(id: string): Promise<void> {
    return request<void>(`/api/credentials/${id}`, { method: "DELETE" });
  },
};

export const skillsApi = {
  list(): Promise<NamedRef[]> {
    return request<NamedRef[]>("/api/skills", { method: "GET" });
  },
  create(name: string): Promise<NamedRef> {
    return request<NamedRef>("/api/skills", { method: "POST", body: JSON.stringify({ name }) });
  },
};

export const tagsApi = {
  list(): Promise<NamedRef[]> {
    return request<NamedRef[]>("/api/tags", { method: "GET" });
  },
  create(name: string): Promise<NamedRef> {
    return request<NamedRef>("/api/tags", { method: "POST", body: JSON.stringify({ name }) });
  },
};

export const organizationsApi = {
  list(): Promise<OrganizationRef[]> {
    return request<OrganizationRef[]>("/api/organizations", { method: "GET" });
  },
  create(input: { name: string; website?: string; description?: string }): Promise<OrganizationRef> {
    return request<OrganizationRef>("/api/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

export const evidenceApi = {  list(credentialId: string): Promise<EvidenceItem[]> {
    return request<EvidenceItem[]>(`/api/credentials/${credentialId}/evidence`, { method: "GET" });
  },
  async initiate(
    credentialId: string,
    input: { fileName: string; mimeType: string; fileSize: number },
  ): Promise<{ evidence: EvidenceItem; uploadUrl: string; expiresIn: number }> {
    return request(`/api/credentials/${credentialId}/evidence/initiate`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  complete(id: string): Promise<EvidenceItem> {
    return request<EvidenceItem>(`/api/evidence/${id}/complete`, { method: "POST" });
  },
  downloadUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return request(`/api/evidence/${id}/url`, { method: "GET" });
  },
  remove(id: string): Promise<void> {
    return request<void>(`/api/evidence/${id}`, { method: "DELETE" });
  },
};

// --- Phase 8: career features -----------------------------------------------
// DTOs mirror apps/api/src/routes/career.ts. All deterministic (non-AI):
// the API only ever returns verbatim stored credential data.

export interface TimelineGroup {
  year: number | null;
  count: number;
  credentials: CredentialSummary[];
}

export interface TimelineResult {
  ok: boolean;
  data: TimelineGroup[];
  meta: { page: number; pageSize: number; total: number; totalYears: number };
}

export interface TimelineQuery {
  search?: string;
  type?: string;
  skill?: string;
  tag?: string;
  year?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface CareerProfile {
  totals: {
    credentials: number;
    evidence: number;
    skills: number;
    tags: number;
    organizations: number;
    byType: Record<CredentialType, number>;
  };
  dateRange: { earliest: string | null; latest: string | null };
  topSkills: NamedRef[];
  topTags: NamedRef[];
  evidenceCoverage: { withEvidence: number; withoutEvidence: number };
}

export interface SkillHistoryItem {
  id: string;
  name: string;
  credentialCount: number;
  firstUsed: string | null;
  lastUsed: string | null;
  credentials: { id: string; title: string; date: string | null; type: CredentialType }[];
}

export interface ResumeBuildResult {
  matched: CredentialSummary[];
  markdown: string;
  targetRole: string | null;
}

export interface PortfolioEntry {
  credential: CredentialSummary;
  markdown: string;
}

export interface PortfolioBuildResult {
  entries: PortfolioEntry[];
  combinedMarkdown: string;
}

function toTimelineQuery(q: TimelineQuery): string {
  const params = new URLSearchParams();
  if (q.search) params.set("search", q.search);
  if (q.type) params.set("type", q.type);
  if (q.skill) params.set("skill", q.skill);
  if (q.tag) params.set("tag", q.tag);
  if (q.year) params.set("year", String(q.year));
  if (q.sort) params.set("sort", q.sort);
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function getWithMeta<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: "include", method: "GET" });
  const body = (await res.json().catch(() => null)) as (T & { ok?: boolean; error?: string; message?: string }) | null;
  if (!res.ok || !body || body.ok === false) {
    throw new ApiError(res.status, body?.error ?? "REQUEST_FAILED", body?.message);
  }
  return body;
}

export const timelineApi = {
  list(q: TimelineQuery): Promise<TimelineResult> {
    return getWithMeta<TimelineResult>(`/api/timeline${toTimelineQuery(q)}`);
  },
};

export const careerApi = {
  profile(): Promise<CareerProfile> {
    return request<CareerProfile>("/api/career/profile", { method: "GET" });
  },
  skills(sort?: string, search?: string): Promise<SkillHistoryItem[]> {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (search) params.set("search", search);
    const s = params.toString();
    return request<SkillHistoryItem[]>(`/api/career/skills${s ? `?${s}` : ""}`, { method: "GET" });
  },
};

export const resumeApi = {
  build(input: {
    targetRole?: string;
    skill?: string;
    tag?: string;
    includeTypes?: CredentialType[];
    credentialIds?: string[];
    limit?: number;
  }): Promise<ResumeBuildResult> {
    return request<ResumeBuildResult>("/api/resume/build", { method: "POST", body: JSON.stringify(input) });
  },
};
export const portfolioApi = {
  build(input: {
    credentialIds?: string[];
    type?: CredentialType;
    skill?: string;
    tag?: string;
    search?: string;
    limit?: number;
  }): Promise<PortfolioBuildResult> {
    return request<PortfolioBuildResult>("/api/portfolio/build", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

// --- Job matching (deterministic, no AI) ------------------------------------
// Shapes mirror apps/api/src/lib/jobs.ts + routes/jobs.ts. Scores are plain
// keyword overlap between a posting and the user's own skill names.

export type JobScope = "local" | "international";
export type WorkType = "ONSITE" | "REMOTE" | "HYBRID" | "UNKNOWN";

export interface QualificationProfile {
  topSkills: NamedRef[];
  totalCredentials: number;
  yearsActive: { start: string; end: string } | null;
  byType: Partial<Record<CredentialType, number>>;
  suggestedQueries: string[];
}

export interface JobResult {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  workType: WorkType;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryText: string | null;
  postedAt: string | null;
  url: string | null;
  snippet: string | null;
  source: "JSEARCH" | "REMOTIVE";
  score: number;
  matchedSkills: string[];
}

export interface JobsSearchResult {
  jobs: JobResult[];
  cached: boolean;
  scope: JobScope;
  query: string;
  location: string;
  totalSkills: number;
}

export const jobsApi = {
  qualifications(): Promise<QualificationProfile> {
    return request<QualificationProfile>("/api/career/qualifications", { method: "GET" });
  },
  search(input: {
    scope: JobScope;
    query?: string;
    location?: string;
    skills?: string[];
    limit?: number;
  }): Promise<JobsSearchResult> {
    return request<JobsSearchResult>("/api/jobs/search", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
