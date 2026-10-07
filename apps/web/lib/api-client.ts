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
  list(q: CredentialQuery): Promise<CredentialList> {
    return request<CredentialList>(`/api/credentials${toQuery(q)}`, { method: "GET" });
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

export const evidenceApi = {
  list(credentialId: string): Promise<EvidenceItem[]> {
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
