import { AppError } from "./errors.js";

// Deterministic job-listing providers (no AI). Both third-party responses are
// normalized into JobListing so route code never touches provider shapes, and
// both adapters parse defensively (several envelope variants) because free-tier
// provider schemas drift without notice.
//
// Quota protection: JSearch's free tier is 200 calls/month, so raw provider
// results are cached per (scope, query, location) for JOBS_CACHE_TTL_MS.
// Scoring happens per request against the caller's skills, so cached listings
// stay correct for every user.

export type JobSource = "JSEARCH" | "REMOTIVE";
export type WorkType = "ONSITE" | "REMOTE" | "HYBRID" | "UNKNOWN";

export interface JobListing {
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
  source: JobSource;
}

export interface ScoredJob extends JobListing {
  score: number;
  matchedSkills: string[];
}

export const JOBS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type FetchImpl = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

let fetchImpl: FetchImpl = (url, init) => fetch(url, init);
let cache = new Map<string, { at: number; listings: JobListing[] }>();

// Test seam (mirrors __resetStorageForTests): stub the network and clear the
// quota cache without touching production code paths.
export function __setJobsFetchForTests(fn: FetchImpl | null): void {
  fetchImpl = fn ?? ((url, init) => fetch(url, init));
}

export function __resetJobsCacheForTests(): void {
  cache = new Map();
}

function jsearchConfigured(): boolean {
  return Boolean(process.env.JSEARCH_API_KEY);
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null);
  return [];
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function snippetOf(text: string | null, max = 300): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

// JSearch (OpenWeb Ninja, Google-for-Jobs aggregate): rich per-job detail but
// a small free quota — hence the cache above. Key stays server-side.
async function fetchJSearchListings(query: string, location: string): Promise<JobListing[]> {
  const key = process.env.JSEARCH_API_KEY;
  if (!key) {
    throw new AppError(503, "JOBS_UNCONFIGURED", "Job search is not configured (JSEARCH_API_KEY missing)");
  }
  const params = new URLSearchParams({ query: `${query} ${location}`.trim(), num_pages: "1" });
  // Local scope IS the Philippines by product definition; the provider
  // defaults to US without an explicit country (verified live: parameters
  // echoed `country: "us"`), so pin it. Language stays English.
  if (location.toLowerCase().includes("philipp")) params.set("country", "ph");
  params.set("language", "en");
  let res: Response;
  try {
    res = await fetchImpl(`https://api.openwebninja.com/jsearch/search-v2?${params}`, {
      headers: { "x-api-key": key },
    });
  } catch {
    throw new AppError(502, "JOBS_PROVIDER_ERROR", "Job provider is unreachable");
  }
  if (!res.ok) {
    throw new AppError(502, "JOBS_PROVIDER_ERROR", `Job provider answered ${res.status}`);
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  // Live shape is { status, request_id, parameters, data: { jobs: [...] } };
  // accept the other envelope variants too — free-tier schemas drift.
  const dataObj = body?.data && typeof body.data === "object" && !Array.isArray(body.data)
    ? (body.data as Record<string, unknown>)
    : null;
  const rows = asArray(dataObj?.jobs ?? body?.data ?? body?.jobs ?? body?.results ?? []);
  return rows.map((r, i) => {
    const title = str(r.job_title) ?? "Untitled role";
    const locationText = str(r.job_location) ?? str(r.job_city) ?? location;
    const haystack = `${title} ${str(r.job_description) ?? ""} ${locationText ?? ""}`;
    const remoteFlag = r.job_is_remote === true || /remote/i.test(str(r.job_employment_type) ?? "");
    const workType: WorkType = remoteFlag
      ? "REMOTE"
      : /hybrid/i.test(haystack)
        ? "HYBRID"
        : locationText
          ? "ONSITE"
          : "UNKNOWN";
    return {
      id: `jsearch-${str(r.job_id) ?? i}`,
      title,
      company: str(r.employer_name) ?? str(r.company_name),
      location: locationText,
      workType,
      salaryMin: num(r.job_min_salary),
      salaryMax: num(r.job_max_salary),
      salaryText: str(r.job_salary_string),
      postedAt: str(r.job_posted_at_datetime_utc) ?? str(r.job_posted_at),
      url: str(r.job_apply_link) ?? str(r.job_google_link),
      snippet: snippetOf(str(r.job_description)),
      source: "JSEARCH" as const,
    };
  });
}

// Remotive public API: remote-only worldwide listings, no key required.
// Terms require crediting Remotive as the source with a link back.
async function fetchRemotiveListings(query: string): Promise<JobListing[]> {
  const params = new URLSearchParams({ search: query });
  let res: Response;
  try {
    res = await fetchImpl(`https://remotive.com/api/remote-jobs?${params}`);
  } catch {
    throw new AppError(502, "JOBS_PROVIDER_ERROR", "Job provider is unreachable");
  }
  if (!res.ok) {
    throw new AppError(502, "JOBS_PROVIDER_ERROR", `Job provider answered ${res.status}`);
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const rows = asArray(body?.jobs ?? body?.data ?? body?.results ?? []);
  return rows.map((r, i) => {
    const description = str(r.description);
    return {
      id: `remotive-${num(r.id) ?? i}`,
      title: str(r.title) ?? "Untitled role",
      company: str(r.company_name),
      location: str(r.candidate_required_location) ?? "Worldwide",
      workType: "REMOTE" as const,
      salaryText: str(r.salary),
      salaryMin: null,
      salaryMax: null,
      postedAt: str(r.publication_date),
      url: str(r.url),
      snippet: snippetOf(description ? description.replace(/<[^>]*>/g, " ") : null),
      source: "REMOTIVE" as const,
    };
  });
}

export function cacheKey(scope: "local" | "international", query: string, location: string): string {
  return `${scope}|${query.toLowerCase()}|${location.toLowerCase()}`;
}

export async function searchJobs(
  scope: "local" | "international",
  query: string,
  location: string,
): Promise<{ listings: JobListing[]; cached: boolean }> {
  const key = cacheKey(scope, query, location);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < JOBS_CACHE_TTL_MS) {
    return { listings: hit.listings, cached: true };
  }
  const listings =
    scope === "local" ? await fetchJSearchListings(query, location) : await fetchRemotiveListings(query);
  cache.set(key, { at: Date.now(), listings });
  return { listings, cached: false };
}

// Overlap scoring against the user's own skill names: +2 per skill in the
// title, +1 per skill in the snippet. Deterministic, explainable, no AI.
export function scoreJobs(listings: JobListing[], skillNames: string[]): ScoredJob[] {
  const skills = [...new Set(skillNames.map((s) => s.toLowerCase()))].filter(Boolean);
  return listings
    .map((job) => {
      const title = job.title.toLowerCase();
      const body = (job.snippet ?? "").toLowerCase();
      const matchedSkills = skills.filter((s) => title.includes(s) || body.includes(s));
      const score = skills.reduce(
        (sum, s) => sum + (title.includes(s) ? 2 : body.includes(s) ? 1 : 0),
        0,
      );
      return { ...job, score, matchedSkills };
    })
    .sort((a, b) => b.score - a.score || b.matchedSkills.length - a.matchedSkills.length);
}
