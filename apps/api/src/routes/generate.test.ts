import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { createTestAgent, deleteTestUser, type TestAgent } from "../test-utils/db.js";

const app = createApp();
let userA!: TestAgent;
let userB!: TestAgent;
let projectId!: string;
let certId!: string;

beforeAll(async () => {
  userA = await createTestAgent(app, "gen-a");
  userB = await createTestAgent(app, "gen-b");

  const skill = await userA.agent.post("/api/skills").send({ name: "GenNode" });
  expect(skill.status).toBe(201);
  const org = await userA.agent.post("/api/organizations").send({ name: "Gen Org" });
  expect(org.status).toBe(201);

  const project = await userA.agent.post("/api/credentials").send({
    title: "Gen Solar Project",
    description: "Built solar pre-assessment with GenNode and APIs.",
    type: "PROJECT",
    date: "2025-04-01T00:00:00Z",
    organizationId: org.body.data.id,
    skillIds: [skill.body.data.id],
  });
  expect(project.status).toBe(201);
  projectId = project.body.data.id as string;

  const cert = await userA.agent.post("/api/credentials").send({ title: "Gen Cloud Cert", type: "CERTIFICATE" });
  expect(cert.status).toBe(201);
  certId = cert.body.data.id as string;
}, 120000);

afterAll(async () => {
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
}, 60000);

describe("phase 9: generate endpoints require auth", () => {
  it("rejects unauthenticated requests with UNAUTHENTICATED", async () => {
    for (const r of [
      await request(app).post("/api/resume/bullets").send({ credentialIds: ["x"] }),
      await request(app).post("/api/portfolio/describe").send({ credentialIds: ["x"] }),
      await request(app).post("/api/interviews/prepare").send({}),
    ]) {
      expect(r.status).toBe(401);
      expect(r.body.error).toBe("UNAUTHENTICATED");
    }
  });
});

describe("POST /api/resume/bullets", () => {
  it("builds template bullets from stored fields only", async () => {
    const res = await userA.agent.post("/api/resume/bullets").send({ credentialIds: [projectId] });
    expect(res.status).toBe(200);
    const [entry] = res.body.data;
    expect(entry.title).toBe("Gen Solar Project");
    expect(entry.lines[0]).toBe("Built Gen Solar Project (2025, with Gen Org).");
    expect(entry.lines).toContain("Built solar pre-assessment with GenNode and APIs.");
    expect(entry.lines).toContain("Applied GenNode in practice.");
    // No evidence uploaded: the evidence sentence is skipped, never invented.
    expect(entry.lines.join("\n")).not.toMatch(/evidence/i);
    expect(entry.lines.join("\n")).not.toMatch(/kubernetes/i);
  });

  it("skips sentences for missing fields (minimal credential)", async () => {
    const res = await userA.agent.post("/api/resume/bullets").send({ credentialIds: [certId] });
    expect(res.status).toBe(200);
    expect(res.body.data[0].lines).toEqual(["Earned Gen Cloud Cert."]);
  });

  it("rejects foreign credentialIds with NOT_FOUND", async () => {
    const res = await userB.agent.post("/api/resume/bullets").send({ credentialIds: [projectId] });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("rejects invalid bodies", async () => {
    const empty = await userA.agent.post("/api/resume/bullets").send({ credentialIds: [] });
    expect(empty.status).toBe(400);
    const badId = await userA.agent.post("/api/resume/bullets").send({ credentialIds: ["nope"] });
    expect(badId.status).toBe(400);
  });
});

describe("POST /api/portfolio/describe", () => {
  it("assembles polished paragraphs from stored fields", async () => {
    const res = await userA.agent.post("/api/portfolio/describe").send({ credentialIds: [projectId] });
    expect(res.status).toBe(200);
    const [entry] = res.body.data;
    expect(entry.paragraphs[0]).toContain("Gen Solar Project is a project with Gen Org completed in 2025.");
    expect(entry.paragraphs[0]).toContain("Built solar pre-assessment with GenNode and APIs.");
    expect(entry.paragraphs[1]).toBe("Skills and technologies involved include GenNode.");
    // No evidence and no url: no closing paragraph is invented.
    expect(entry.paragraphs).toHaveLength(2);
  });

  it("rejects foreign credentialIds with NOT_FOUND", async () => {
    const res = await userB.agent.post("/api/portfolio/describe").send({ credentialIds: [certId] });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/interviews/prepare", () => {
  it("generates questions paired with talking points citing the record", async () => {
    const res = await userA.agent.post("/api/interviews/prepare").send({ credentialIds: [projectId] });
    expect(res.status).toBe(200);
    const { questions } = res.body.data;
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions[0].question).toBe("Walk me through Gen Solar Project.");
    expect(questions[0].talkingPoints).toEqual(
      expect.arrayContaining([
        "Built solar pre-assessment with GenNode and APIs.",
        "Skills on record: GenNode.",
      ]),
    );
    const skillQ = questions.find((q: { question: string }) => q.question.includes("GenNode"));
    expect(skillQ).toBeDefined();
    expect(skillQ.talkingPoints).toContain("No evidence files attached yet.");
  });

  it("filters by skill and caps total questions with limit", async () => {
    const filtered = await userA.agent.post("/api/interviews/prepare").send({ skill: "GenNode" });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.totalCredentials).toBe(1);
    expect(
      filtered.body.data.questions.every((q: { credentialTitle: string }) => q.credentialTitle === "Gen Solar Project"),
    ).toBe(true);

    const capped = await userA.agent
      .post("/api/interviews/prepare")
      .send({ credentialIds: [projectId, certId], limit: 2 });
    expect(capped.body.data.questions).toHaveLength(2);
  });

  it("defaults to recent credentials and returns empty (not error) for an empty vault", async () => {
    const def = await userA.agent.post("/api/interviews/prepare").send({});
    expect(def.status).toBe(200);
    expect(def.body.data.totalCredentials).toBe(2);

    const empty = await userB.agent.post("/api/interviews/prepare").send({});
    expect(empty.status).toBe(200);
    expect(empty.body.data.questions).toEqual([]);
  });

  it("rejects invalid bodies and foreign ids", async () => {
    const bad = await userA.agent.post("/api/interviews/prepare").send({ limit: 999 });
    expect(bad.status).toBe(400);
    const foreign = await userB.agent.post("/api/interviews/prepare").send({ credentialIds: [projectId] });
    expect(foreign.status).toBe(404);
  });
});
