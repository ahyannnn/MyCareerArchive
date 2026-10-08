import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { __resetCacheForTests } from "../lib/cache.js";
import { createTestAgent, deleteTestUser, type TestAgent } from "../test-utils/db.js";

const app = createApp();
let userA!: TestAgent;
let userB!: TestAgent;

let nodeSkill!: { id: string; name: string };
let reactSkill!: { id: string; name: string };
let expressSkill!: { id: string; name: string };
let portfolioTag!: { id: string; name: string };
let credentialIds: Record<string, string> = {};

async function createSkill(name: string) {
  const res = await userA.agent.post("/api/skills").send({ name });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

async function createTag(name: string) {
  const res = await userA.agent.post("/api/tags").send({ name });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

async function createCredential(body: Record<string, unknown>) {
  const res = await userA.agent.post("/api/credentials").send(body);
  expect(res.status).toBe(201);
  return res.body.data as { id: string; title: string };
}

beforeAll(async () => {
  userA = await createTestAgent(app, "career-a");
  userB = await createTestAgent(app, "career-b");

  nodeSkill = await createSkill("CareerNode");
  reactSkill = await createSkill("CareerReact");
  expressSkill = await createSkill("CareerExpress");
  portfolioTag = await createTag("career-portfolio-tag");

  const alpha = await createCredential({
    title: "Timeline Project Alpha",
    description: "Alpha project from 2024",
    type: "PROJECT",
    date: "2024-05-01T00:00:00Z",
    skillIds: [nodeSkill.id],
    tagIds: [portfolioTag.id],
  });
  const beta = await createCredential({
    title: "Timeline Cert Beta",
    description: "Beta certificate from 2025",
    type: "CERTIFICATE",
    date: "2025-06-01T00:00:00Z",
    skillIds: [nodeSkill.id],
  });
  const gamma = await createCredential({
    title: "Timeline Talk Gamma",
    description: "Undated seminar",
    type: "SEMINAR",
    skillIds: [reactSkill.id],
  });
  const delta = await createCredential({
    title: "Resume Backend Delta",
    description: "Backend APIs with Express and Postgres",
    type: "PROJECT",
    date: "2026-01-15T00:00:00Z",
    skillIds: [nodeSkill.id, expressSkill.id],
  });
  credentialIds = { alpha: alpha.id, beta: beta.id, gamma: gamma.id, delta: delta.id };
}, 120000);

afterAll(async () => {
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
}, 60000);

describe("phase 8: career endpoints require auth", () => {
  it("rejects unauthenticated requests with UNAUTHENTICATED", async () => {
    for (const r of [
      await request(app).get("/api/timeline"),
      await request(app).get("/api/career/profile"),
      await request(app).get("/api/career/skills"),
      await request(app).post("/api/resume/build").send({}),
      await request(app).post("/api/portfolio/build").send({}),
    ]) {
      expect(r.status).toBe(401);
      expect(r.body.error).toBe("UNAUTHENTICATED");
    }
  });
});

describe("GET /api/timeline", () => {
  it("groups credentials by year with undated last", async () => {
    const res = await userA.agent.get("/api/timeline").query({ pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const years = res.body.data.map((g: { year: number | null }) => g.year);
    expect(years).toContain(2024);
    expect(years).toContain(2025);
    expect(years).toContain(2026);
    expect(years).toContain(null);
    // Default sort is date-desc: 2026 first, undated last.
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(null);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
    expect(res.body.meta.totalYears).toBeGreaterThanOrEqual(4);
  });

  it("supports date-asc ordering", async () => {
    const res = await userA.agent.get("/api/timeline").query({ sort: "date-asc", pageSize: 50 });
    expect(res.status).toBe(200);
    const years = res.body.data.map((g: { year: number | null }) => g.year);
    expect(years[0]).toBe(2024);
    expect(years[years.length - 1]).toBe(null);
  });

  it("filters by type and year", async () => {
    const byType = await userA.agent.get("/api/timeline").query({ type: "CERTIFICATE", pageSize: 50 });
    expect(byType.status).toBe(200);
    const titles = byType.body.data.flatMap((g: { credentials: { title: string }[] }) =>
      g.credentials.map((c) => c.title),
    );
    expect(titles).toContain("Timeline Cert Beta");
    expect(titles).not.toContain("Timeline Project Alpha");

    const byYear = await userA.agent.get("/api/timeline").query({ year: 2024, pageSize: 50 });
    expect(byYear.status).toBe(200);
    const yearTitles = byYear.body.data.flatMap((g: { credentials: { title: string }[] }) =>
      g.credentials.map((c) => c.title),
    );
    expect(yearTitles).toContain("Timeline Project Alpha");
    expect(yearTitles).not.toContain("Timeline Cert Beta");
  });

  it("isolates users (no cross-user leakage)", async () => {
    const res = await userB.agent.get("/api/timeline");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("rejects invalid query params", async () => {
    const badYear = await userA.agent.get("/api/timeline").query({ year: "not-a-year" });
    expect(badYear.status).toBe(400);
    expect(badYear.body.error).toBe("VALIDATION_ERROR");
    const badSort = await userA.agent.get("/api/timeline").query({ sort: "nope" });
    expect(badSort.status).toBe(400);
  });
});

describe("GET /api/career/profile", () => {
  it("returns totals, byType, dateRange, top skills/tags, and evidence coverage", async () => {
    const res = await userA.agent.get("/api/career/profile");
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals.credentials).toBeGreaterThanOrEqual(4);
    expect(d.totals.skills).toBe(3);
    expect(d.totals.tags).toBe(1);
    expect(d.totals.byType.PROJECT).toBeGreaterThanOrEqual(2);
    expect(d.totals.byType.CERTIFICATE).toBe(1);
    expect(d.totals.byType.SEMINAR).toBe(1);
    expect(new Date(d.dateRange.earliest).getUTCFullYear()).toBe(2024);
    expect(new Date(d.dateRange.latest).getUTCFullYear()).toBe(2026);
    expect(d.topSkills[0].name).toBe("CareerNode");
    expect(d.topSkills[0].credentialCount).toBe(3);
    expect(d.topTags[0].name).toBe("career-portfolio-tag");
    // No evidence uploaded in this suite: coverage sums to the total.
    expect(d.evidenceCoverage.withEvidence + d.evidenceCoverage.withoutEvidence).toBe(d.totals.credentials);
  });

  it("is empty for a fresh user", async () => {
    const res = await userB.agent.get("/api/career/profile");
    expect(res.status).toBe(200);
    expect(res.body.data.totals.credentials).toBe(0);
    expect(res.body.data.dateRange).toEqual({ earliest: null, latest: null });
  });
});

describe("GET /api/career/skills", () => {
  it("returns per-skill counts with first/last use and credential drill-down", async () => {
    const res = await userA.agent.get("/api/career/skills");
    expect(res.status).toBe(200);
    const node = res.body.data.find((s: { name: string }) => s.name === "CareerNode");
    expect(node.credentialCount).toBe(3);
    expect(new Date(node.firstUsed).getUTCFullYear()).toBe(2024);
    expect(new Date(node.lastUsed).getUTCFullYear()).toBe(2026);
    expect(node.credentials.map((c: { title: string }) => c.title)).toEqual(
      expect.arrayContaining(["Timeline Project Alpha", "Timeline Cert Beta", "Resume Backend Delta"]),
    );
    // Default sort is count-desc: CareerNode (3) first.
    expect(res.body.data[0].name).toBe("CareerNode");
  });

  it("supports name sorting and search", async () => {
    const byName = await userA.agent.get("/api/career/skills").query({ sort: "name" });
    const names = byName.body.data.map((s: { name: string }) => s.name);
    expect([...names].sort()).toEqual(names);

    const search = await userA.agent.get("/api/career/skills").query({ search: "CareerReact" });
    expect(search.body.data.map((s: { name: string }) => s.name)).toEqual(["CareerReact"]);
  });

  it("supports recent sorting (most recently used first)", async () => {
    const res = await userA.agent.get("/api/career/skills").query({ sort: "recent" });
    expect(res.status).toBe(200);
    // CareerNode and CareerExpress were both last used in 2026; CareerReact is undated.
    expect(res.body.data[res.body.data.length - 1].name).toBe("CareerReact");
  });
});

describe("POST /api/resume/build", () => {
  it("ranks by target-role keyword overlap", async () => {
    const res = await userA.agent
      .post("/api/resume/build")
      .send({ targetRole: "Backend Developer", limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.targetRole).toBe("Backend Developer");
    expect(res.body.data.matched[0].title).toBe("Resume Backend Delta");
    expect(res.body.data.markdown).toContain("Resume Backend Delta");
    expect(res.body.data.markdown).toContain("CareerExpress");
  });

  it("never invents experience: markdown only contains stored values", async () => {
    const res = await userA.agent.post("/api/resume/build").send({ targetRole: "Backend", limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.markdown).not.toMatch(/kubernetes/i);
    expect(res.body.data.markdown).not.toMatch(/85%/);
  });

  it("honors explicit credentialIds selection", async () => {
    const res = await userA.agent
      .post("/api/resume/build")
      .send({ credentialIds: [credentialIds.beta], targetRole: "Backend" });
    expect(res.status).toBe(200);
    expect(res.body.data.matched.map((c: { id: string }) => c.id)).toEqual([credentialIds.beta]);
    expect(res.body.data.markdown).toContain("Timeline Cert Beta");
  });

  it("rejects foreign credentialIds with NOT_FOUND", async () => {
    const res = await userB.agent.post("/api/resume/build").send({ credentialIds: [credentialIds.alpha] });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("rejects invalid bodies", async () => {
    const bad = await userA.agent.post("/api/resume/build").send({ limit: 999 });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/portfolio/build", () => {
  it("builds per-entry markdown plus a combined document", async () => {
    const res = await userA.agent.post("/api/portfolio/build").send({ limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.entries.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.entries[0].markdown).toContain(res.body.data.entries[0].credential.title);
    expect(res.body.data.combinedMarkdown).toContain("# Portfolio");
    expect(res.body.data.combinedMarkdown).toContain("Timeline Project Alpha");
  });

  it("filters by type across all eligible types", async () => {
    const res = await userA.agent.post("/api/portfolio/build").send({ type: "SEMINAR" });
    expect(res.status).toBe(200);
    expect(res.body.data.entries.map((e: { credential: { title: string } }) => e.credential.title)).toEqual([
      "Timeline Talk Gamma",
    ]);
  });

  it("rejects foreign credentialIds with NOT_FOUND", async () => {
    const res = await userB.agent.post("/api/portfolio/build").send({ credentialIds: [credentialIds.beta] });
    expect(res.status).toBe(404);
  });
});

describe("phase 9 perf: timeline year parity (raw-SQL vs old full-scan)", () => {
  it("counts distinct years under the same filters", async () => {
    const all = await userA.agent.get("/api/timeline").query({ pageSize: 50 });
    expect(all.status).toBe(200);
    const years = new Set(all.body.data.map((g: { year: number | null }) => g.year));
    expect(all.body.meta.totalYears).toBe(years.size);

    const y2024 = await userA.agent.get("/api/timeline").query({ year: 2024, pageSize: 50 });
    expect(y2024.body.meta.totalYears).toBe(1);
    expect(y2024.body.data).toHaveLength(1);

    const certs = await userA.agent.get("/api/timeline").query({ type: "CERTIFICATE", pageSize: 50 });
    expect(certs.body.meta.totalYears).toBe(1);
  });
});

describe("phase 9 perf: profile aggregate caching", () => {
  it("serves stale aggregates within TTL, isolates users, refreshes after reset", async () => {
    const before = await userA.agent.get("/api/career/profile");
    expect(before.status).toBe(200);
    const totalBefore = before.body.data.totals.credentials as number;

    const created = await userA.agent.post("/api/credentials").send({ title: "Cache Probe", type: "OTHER" });
    expect(created.status).toBe(201);

    // Still cached: new credential invisible until TTL/reset.
    const cachedRes = await userA.agent.get("/api/career/profile");
    expect(cachedRes.body.data.totals.credentials).toBe(totalBefore);

    // Isolation: user B never sees user A's cached aggregates.
    const other = await userB.agent.get("/api/career/profile");
    expect(other.body.data.totals.credentials).toBe(0);

    __resetCacheForTests();
    const fresh = await userA.agent.get("/api/career/profile");
    expect(fresh.body.data.totals.credentials).toBe(totalBefore + 1);
  });
});
