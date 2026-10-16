import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "./errors.js";
import {
  __resetJobsCacheForTests,
  __setJobsFetchForTests,
  cacheKey,
  scoreJobs,
  searchJobs,
  type JobListing,
} from "./jobs.js";

const REMOTIVE_BODY = {
  jobs: [
    {
      id: 7,
      title: "Backend Developer (Node.js)",
      company_name: "Acme",
      candidate_required_location: "Philippines",
      salary: "$60k",
      publication_date: "2026-01-01",
      url: "https://example.com/job",
      description: "<p>Build REST APIs with PostgreSQL.</p>",
    },
  ],
};

const JSEARCH_BODY = {
  data: {
    jobs: [
      {
        job_id: "abc",
        job_title: "Senior Node.js Engineer",
        employer_name: "Globex",
        job_location: "Makati, Philippines",
        job_employment_type: "FULLTIME",
        job_min_salary: 80000,
        job_max_salary: 120000,
        job_apply_link: "https://example.com/apply",
        job_description: "Node.js and REST API work, hybrid setup.",
        job_posted_at: "2026-02-01",
      },
      {
        job_title: "Remote Designer",
        job_is_remote: true,
        job_description: "Design systems.",
      },
    ],
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchStub: ReturnType<typeof vi.fn>;
let requestedUrls: string[];
let originalKey: string | undefined;

beforeEach(() => {
  __resetJobsCacheForTests();
  requestedUrls = [];
  originalKey = process.env.JSEARCH_API_KEY;
  fetchStub = vi.fn(async (url: string) => {
    requestedUrls.push(url);
    return jsonResponse(REMOTIVE_BODY);
  });
  __setJobsFetchForTests(fetchStub);
});

afterEach(() => {
  __setJobsFetchForTests(null);
  __resetJobsCacheForTests();
  if (originalKey === undefined) delete process.env.JSEARCH_API_KEY;
  else process.env.JSEARCH_API_KEY = originalKey;
});

function listing(overrides: Partial<JobListing> = {}): JobListing {
  return {
    id: "1",
    title: "Backend Developer",
    company: "Acme",
    location: "Manila",
    workType: "ONSITE",
    salaryMin: null,
    salaryMax: null,
    salaryText: null,
    postedAt: null,
    url: null,
    snippet: "Node.js and PostgreSQL experience wanted.",
    source: "REMOTIVE",
    ...overrides,
  };
}

describe("cacheKey", () => {
  it("normalizes scope, query, and location", () => {
    expect(cacheKey("local", "Node.JS", "MANILA")).toBe("local|node.js|manila");
  });
});

describe("scoreJobs", () => {
  it("scores +2 for title hits and +1 for snippet hits", () => {
    const [a] = scoreJobs([listing({ title: "Node.js Engineer" })], ["node.js"]);
    expect(a.score).toBe(2);
    const [b] = scoreJobs([listing({ title: "Cook", snippet: "knows node.js" })], ["node.js"]);
    expect(b.score).toBe(1);
    expect(b.matchedSkills).toEqual(["node.js"]);
  });

  it("is case-insensitive, dedupes skills, and sorts by score", () => {
    const scored = scoreJobs(
      [listing({ id: "low", title: "Cook", snippet: "Culinary experience wanted." }), listing({ id: "high", title: "NODE.JS Dev" })],
      ["Node.js", "node.js", ""],
    );
    expect(scored.map((j) => j.id)).toEqual(["high", "low"]);
    expect(scored[1]).toMatchObject({ score: 0, matchedSkills: [] });
  });
});

describe("searchJobs", () => {
  it("normalizes Remotive listings and serves the second call from cache", async () => {
    const first = await searchJobs("international", "backend", "anywhere");
    expect(first.cached).toBe(false);
    expect(first.listings).toHaveLength(1);
    expect(first.listings[0]).toMatchObject({
      id: "remotive-7",
      title: "Backend Developer (Node.js)",
      company: "Acme",
      workType: "REMOTE",
      url: "https://example.com/job",
    });
    expect(first.listings[0].snippet).toContain("REST APIs");

    const second = await searchJobs("international", "backend", "anywhere");
    expect(second.cached).toBe(true);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it("throws JOBS_UNCONFIGURED for local scope without a key", async () => {
    delete process.env.JSEARCH_API_KEY;
    const err = await searchJobs("local", "backend", "Manila").catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 503, code: "JOBS_UNCONFIGURED" });
  });

  it("parses JSearch envelopes and pins the Philippines country", async () => {
    process.env.JSEARCH_API_KEY = "test-key";
    fetchStub.mockImplementation(async (url: string) => {
      requestedUrls.push(url);
      return jsonResponse(JSEARCH_BODY);
    });
    const { listings } = await searchJobs("local", "backend", "Manila, Philippines");
    expect(requestedUrls[0]).toContain("country=ph");
    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      id: "jsearch-abc",
      company: "Globex",
      workType: "HYBRID",
      salaryMin: 80000,
      salaryMax: 120000,
    });
    expect(listings[1]).toMatchObject({ workType: "REMOTE", title: "Remote Designer" });
  });

  it("accepts the top-level jobs envelope variant", async () => {
    process.env.JSEARCH_API_KEY = "test-key";
    fetchStub.mockImplementation(async () => jsonResponse({ jobs: [{ job_title: "Dev" }] }));
    const { listings } = await searchJobs("local", "x", "Manila");
    expect(listings[0].title).toBe("Dev");
  });

  it("tolerates drifting provider envelopes", async () => {
    process.env.JSEARCH_API_KEY = "test-key";
    fetchStub.mockImplementation(async () => jsonResponse({ data: "not-an-object" }));
    await expect(searchJobs("local", "x", "Manila")).resolves.toMatchObject({ listings: [] });
  });

  it("throws JOBS_PROVIDER_ERROR on provider HTTP errors and network failures", async () => {
    process.env.JSEARCH_API_KEY = "test-key";
    fetchStub.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(searchJobs("local", "x", "Manila")).rejects.toMatchObject({
      code: "JOBS_PROVIDER_ERROR",
      statusCode: 502,
    });
    __resetJobsCacheForTests();
    fetchStub.mockRejectedValueOnce(new Error("down"));
    await expect(searchJobs("local", "y", "Cebu")).rejects.toMatchObject({
      code: "JOBS_PROVIDER_ERROR",
    });
    __resetJobsCacheForTests();
    fetchStub.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(searchJobs("international", "x", "y")).rejects.toMatchObject({
      code: "JOBS_PROVIDER_ERROR",
    });
  });
});
