import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { __resetJobsCacheForTests, __setJobsFetchForTests } from "../lib/jobs.js";
import { createTestAgent, deleteTestUser, type TestAgent } from "../test-utils/db.js";

const app = createApp();
let userA!: TestAgent;
let userB!: TestAgent;

let fetchCalls = 0;

// Live JSearch envelope (verified against the real API): { status,
// request_id, parameters, data: { jobs: [...] } }.
const JSEARCH_PAYLOAD = {
  status: "OK",
  request_id: "test-request-id",
  parameters: { query: "developer Philippines", num_pages: 1, country: "ph", language: "en" },
  data: {
    jobs: [
    {
      job_id: "js-1",
      job_title: "JobsNode Developer",
      employer_name: "Manila Tech Inc",
      job_location: "Manila, Philippines",
      job_is_remote: false,
      job_description: "We need JobsNode and JobsReact engineers for our backend team.",
      job_min_salary: 60000,
      job_max_salary: 90000,
      job_salary_string: "PHP 60K-90K a month",
      job_posted_at_datetime_utc: "2026-09-20T00:00:00.000Z",
      job_apply_link: "https://example.com/jobs/js-1",
    },
    {
      job_id: "js-2",
      job_title: "Remote JobsReact Engineer",
      employer_name: "Cebu Cloud Corp",
      job_location: "Philippines",
      job_is_remote: true,
      job_description: "Frontend role.",
      job_posted_at_datetime_utc: "2026-09-18T00:00:00.000Z",
      job_apply_link: "https://example.com/jobs/js-2",
    },
    {
      job_id: "js-3",
      job_title: "Hybrid Designer",
      employer_name: "Makati Studio",
      job_location: "Makati, Philippines",
      job_is_remote: false,
      job_description: "Hybrid role, three days on site.",
      job_apply_link: "https://example.com/jobs/js-3",
    },
    {
      job_id: "js-4",
      job_title: "Java Accountant",
      employer_name: "Ortigas Ledger",
      job_location: "Pasig, Philippines",
      job_is_remote: false,
      job_description: "Bookkeeping and audits.",
      job_apply_link: "https://example.com/jobs/js-4",
    },
    ],
  },
};

const REMOTIVE_PAYLOAD = {
  jobs: [
    {
      id: 101,
      title: "Senior JobsReact Engineer",
      company_name: "Worldwide Remote Co",
      candidate_required_location: "Worldwide",
      salary: "$80k-$120k",
      publication_date: "2026-09-21T00:00:00",
      url: "https://example.com/jobs/rm-101",
      description: "<p>JobsReact and JobsNode role for our distributed team.</p>",
    },
  ],
};

function stubFetch(url: string): Promise<Response> {
  fetchCalls += 1;
  const payload = url.includes("openwebninja") ? JSEARCH_PAYLOAD : REMOTIVE_PAYLOAD;
  return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
}

beforeAll(async () => {
  process.env.JSEARCH_API_KEY = "test-key";
  __setJobsFetchForTests(stubFetch);
  userA = await createTestAgent(app, "jobs-a");
  userB = await createTestAgent(app, "jobs-b");

  const nodeRes = await userA.agent.post("/api/skills").send({ name: "JobsNode" });
  const reactRes = await userA.agent.post("/api/skills").send({ name: "JobsReact" });
  expect(nodeRes.status).toBe(201);
  expect(reactRes.status).toBe(201);

  const cred = await userA.agent.post("/api/credentials").send({
    title: "Jobs Backend Project",
    type: "PROJECT",
    date: "2024-03-01T00:00:00Z",
    skillIds: [nodeRes.body.data.id, reactRes.body.data.id],
  });
  expect(cred.status).toBe(201);
  const cred2 = await userA.agent.post("/api/credentials").send({
    title: "Jobs Frontend Project",
    type: "PROJECT",
    date: "2026-02-01T00:00:00Z",
    skillIds: [nodeRes.body.data.id],
  });
  expect(cred2.status).toBe(201);
});

beforeEach(() => {
  __resetJobsCacheForTests();
  fetchCalls = 0;
});

afterAll(async () => {
  __setJobsFetchForTests(null);
  delete process.env.JSEARCH_API_KEY;
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
});

describe("phase 9: jobs endpoints require auth", () => {
  it("rejects unauthenticated requests with UNAUTHENTICATED", async () => {
    const profile = await request(app).get("/api/career/qualifications");
    expect(profile.status).toBe(401);
    expect(profile.body.error).toBe("UNAUTHENTICATED");
    const search = await request(app).post("/api/jobs/search").send({ scope: "local" });
    expect(search.status).toBe(401);
  });
});

describe("GET /api/career/qualifications", () => {
  it("derives top skills, years active, and suggested queries from the vault", async () => {
    const res = await userA.agent.get("/api/career/qualifications");
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totalCredentials).toBe(2);
    expect(d.topSkills[0]).toMatchObject({ name: "JobsNode", credentialCount: 2 });
    expect(d.topSkills[1]).toMatchObject({ name: "JobsReact", credentialCount: 1 });
    expect(new Date(d.yearsActive.start).getUTCFullYear()).toBe(2024);
    expect(new Date(d.yearsActive.end).getUTCFullYear()).toBe(2026);
    expect(d.suggestedQueries.length).toBeGreaterThan(0);
    expect(d.suggestedQueries[0]).toContain("JobsNode");
  });

  it("is empty but well-formed for a fresh user", async () => {
    const res = await userB.agent.get("/api/career/qualifications");
    expect(res.status).toBe(200);
    expect(res.body.data.topSkills).toEqual([]);
    expect(res.body.data.suggestedQueries).toEqual([]);
    expect(res.body.data.yearsActive).toBeNull();
  });
});

describe("POST /api/jobs/search (local, JSearch)", () => {
  it("scores by skill overlap and derives work types", async () => {
    const res = await userA.agent.post("/api/jobs/search").send({ scope: "local", query: "developer" });
    expect(res.status).toBe(200);
    const { jobs, cached, scope, location, totalSkills } = res.body.data;
    expect(scope).toBe("local");
    expect(location).toBe("Philippines");
    expect(totalSkills).toBe(2);
    expect(cached).toBe(false);
    // Title match (+2 each) outranks description-only matches.
    expect(jobs[0].title).toBe("JobsNode Developer");
    expect(jobs[0].matchedSkills).toEqual(expect.arrayContaining(["jobsnode", "jobsreact"]));
    expect(jobs[0].workType).toBe("ONSITE");
    expect(jobs[0].salaryMin).toBe(60000);
    expect(jobs[0].salaryMax).toBe(90000);
    const byTitle = Object.fromEntries(jobs.map((j: { title: string; workType: string }) => [j.title, j.workType]));
    expect(byTitle["Remote JobsReact Engineer"]).toBe("REMOTE");
    expect(byTitle["Hybrid Designer"]).toBe("HYBRID");
    expect(byTitle["Java Accountant"]).toBe("ONSITE");
    // Zero-overlap posting sorts last with an empty match list.
    expect(jobs[jobs.length - 1].title).toBe("Java Accountant");
    expect(jobs[jobs.length - 1].matchedSkills).toEqual([]);
  });

  it("serves repeat queries from cache without hitting the provider", async () => {
    const body = { scope: "local", query: "developer" };
    const first = await userA.agent.post("/api/jobs/search").send(body);
    expect(first.body.data.cached).toBe(false);
    expect(fetchCalls).toBe(1);
    const second = await userA.agent.post("/api/jobs/search").send(body);
    expect(second.body.data.cached).toBe(true);
    expect(fetchCalls).toBe(1);
    expect(second.body.data.jobs).toEqual(first.body.data.jobs);
  });

  it("honors explicit skills and limit", async () => {
    const res = await userA.agent
      .post("/api/jobs/search")
      .send({ scope: "local", query: "developer", skills: ["JobsReact"], limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.jobs).toHaveLength(1);
    expect(res.body.data.totalSkills).toBe(1);
    expect(res.body.data.jobs[0].matchedSkills).toEqual(["jobsreact"]);
  });

  it("returns 503 when JSEARCH_API_KEY is missing", async () => {
    delete process.env.JSEARCH_API_KEY;
    try {
      const res = await userA.agent.post("/api/jobs/search").send({ scope: "local", query: "developer" });
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("JOBS_UNCONFIGURED");
    } finally {
      process.env.JSEARCH_API_KEY = "test-key";
    }
  });
});

describe("POST /api/jobs/search (international, Remotive)", () => {
  it("returns remote-only worldwide listings with HTML stripped", async () => {
    const res = await userA.agent.post("/api/jobs/search").send({ scope: "international", query: "engineer" });
    expect(res.status).toBe(200);
    const { jobs } = res.body.data;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].source).toBe("REMOTIVE");
    expect(jobs[0].workType).toBe("REMOTE");
    expect(jobs[0].location).toBe("Worldwide");
    expect(jobs[0].matchedSkills).toEqual(expect.arrayContaining(["jobsnode", "jobsreact"]));
    expect(jobs[0].snippet).not.toContain("<p>");
    expect(jobs[0].url).toBe("https://example.com/jobs/rm-101");
  });
});

describe("POST /api/jobs/search validation", () => {
  it("rejects invalid bodies", async () => {
    const badScope = await userA.agent.post("/api/jobs/search").send({ scope: "mars" });
    expect(badScope.status).toBe(400);
    const badLimit = await userA.agent.post("/api/jobs/search").send({ scope: "local", limit: 999 });
    expect(badLimit.status).toBe(400);
  });

  it("requires a query when the vault has no skills", async () => {
    const res = await userB.agent.post("/api/jobs/search").send({ scope: "international" });
    expect(res.status).toBe(400);
  });
});
