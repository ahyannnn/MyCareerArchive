import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { authHeader, createTestUser, deleteTestUser } from "../test-utils/db.js";

const app = createApp();
let userA = "";
let userB = "";

beforeAll(async () => {
  userA = (await createTestUser("cred-a")).id;
  userB = (await createTestUser("cred-b")).id;
});

afterAll(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

async function createSkill(name: string, userId = userA) {
  const res = await request(app).post("/api/skills").set(authHeader(userId)).send({ name });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

async function createTag(name: string, userId = userA) {
  const res = await request(app).post("/api/tags").set(authHeader(userId)).send({ name });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

describe("credentials CRUD", () => {
  it("creates a credential with linked org, skills, and tags", async () => {
    const orgRes = await request(app)
      .post("/api/organizations")
      .set(authHeader(userA))
      .send({ name: "Cred Test Org" });
    expect(orgRes.status).toBe(201);

    const skill = await createSkill("CredentialSkill");
    const tag = await createTag("credential-tag");

    const res = await request(app)
      .post("/api/credentials")
      .set(authHeader(userA))
      .send({
        title: "SOLARIS",
        description: "Solar pre-assessment capstone",
        type: "PROJECT",
        date: "2026-03-15T00:00:00Z",
        organizationId: orgRes.body.data.id,
        skillIds: [skill.id],
        tagIds: [tag.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.title).toBe("SOLARIS");
    expect(res.body.data.organization.name).toBe("Cred Test Org");
    expect(res.body.data.skills.map((s: { name: string }) => s.name)).toContain("CredentialSkill");
    expect(res.body.data.tags.map((t: { name: string }) => t.name)).toContain("credential-tag");
    expect(res.body.data.evidenceCount).toBe(0);
  });

  it("rejects invalid payloads with VALIDATION_ERROR", async () => {
    const missingTitle = await request(app)
      .post("/api/credentials")
      .set(authHeader(userA))
      .send({ type: "PROJECT" });
    expect(missingTitle.status).toBe(400);
    expect(missingTitle.body.error).toBe("VALIDATION_ERROR");

    const badType = await request(app)
      .post("/api/credentials")
      .set(authHeader(userA))
      .send({ title: "x", type: "NOPE" });
    expect(badType.status).toBe(400);
  });

  it("rejects requests without the user header", async () => {
    const res = await request(app).get("/api/credentials");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHENTICATED");
  });

  it("rejects linking another user's skill", async () => {
    const foreign = await createSkill("ForeignSkill", userB);
    const res = await request(app)
      .post("/api/credentials")
      .set(authHeader(userA))
      .send({ title: "Sneaky", skillIds: [foreign.id] });
    expect(res.status).toBe(404);
  });

  it("lists, searches, and filters", async () => {
    await request(app).post("/api/credentials").set(authHeader(userA)).send({
      title: "Backend Search Target",
      description: "Uses Node.js heavily",
      type: "PROJECT",
      date: "2025-06-01T00:00:00Z",
    });

    const list = await request(app).get("/api/credentials").set(authHeader(userA));
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(2);
    expect(list.body.meta.page).toBe(1);

    const search = await request(app)
      .get("/api/credentials")
      .set(authHeader(userA))
      .query({ search: "Search Target" });
    expect(search.body.meta.total).toBe(1);
    expect(search.body.data[0].title).toBe("Backend Search Target");

    const byYear = await request(app)
      .get("/api/credentials")
      .set(authHeader(userA))
      .query({ year: 2025 });
    expect(byYear.body.data.every((c: { title: string }) => c.title !== "SOLARIS")).toBe(true);

    const byType = await request(app)
      .get("/api/credentials")
      .set(authHeader(userA))
      .query({ type: "PROJECT" });
    expect(byType.body.meta.total).toBeGreaterThanOrEqual(2);

    const bySkill = await request(app)
      .get("/api/credentials")
      .set(authHeader(userA))
      .query({ skill: "CredentialSkill" });
    expect(bySkill.body.data.map((c: { title: string }) => c.title)).toContain("SOLARIS");
  });

  it("reads, updates, and deletes with ownership enforcement", async () => {
    const created = await request(app).post("/api/credentials").set(authHeader(userA)).send({
      title: "Ownership Probe",
      type: "SEMINAR",
    });
    const id = created.body.data.id as string;

    // Other user sees nothing (404, not 403 — no id oracle).
    const foreign = await request(app).get(`/api/credentials/${id}`).set(authHeader(userB));
    expect(foreign.status).toBe(404);

    const tag = await createTag("updated-tag");
    const patched = await request(app)
      .patch(`/api/credentials/${id}`)
      .set(authHeader(userA))
      .send({ title: "Ownership Probe v2", tagIds: [tag.id] });
    expect(patched.status).toBe(200);
    expect(patched.body.data.title).toBe("Ownership Probe v2");
    expect(patched.body.data.tags.map((t: { name: string }) => t.name)).toEqual(["updated-tag"]);

    const foreignPatch = await request(app)
      .patch(`/api/credentials/${id}`)
      .set(authHeader(userB))
      .send({ title: "hijack" });
    expect(foreignPatch.status).toBe(404);

    const deleted = await request(app).delete(`/api/credentials/${id}`).set(authHeader(userA));
    expect(deleted.status).toBe(200);
    expect(deleted.body.ok).toBe(true);

    const gone = await request(app).get(`/api/credentials/${id}`).set(authHeader(userA));
    expect(gone.status).toBe(404);
  });
});
