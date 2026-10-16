import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { createTestAgent, deleteTestUser, type TestAgent } from "../test-utils/db.js";

const app = createApp();
let userA!: TestAgent;
let userB!: TestAgent;

beforeAll(async () => {
  userA = await createTestAgent(app, "org-a");
  userB = await createTestAgent(app, "org-b");
});

afterAll(async () => {
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
});

describe("organizations CRUD", () => {
  it("creates with website and lists with counts", async () => {
    const created = await userA.agent.post("/api/organizations").send({
      name: "ABC Tech",
      website: "https://example.com",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.website).toBe("https://example.com");
    expect(created.body.data.credentialCount).toBe(0);

    const list = await userA.agent.get("/api/organizations");
    expect(list.body.data.map((o: { name: string }) => o.name)).toContain("ABC Tech");
  });

  it("rejects invalid website URLs", async () => {
    const res = await userA.agent
      .post("/api/organizations")
      .send({ name: "Bad Org", website: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("renames with ownership enforcement", async () => {
    const created = await userA.agent.post("/api/organizations").send({ name: "Rename Me" });

    const foreign = await userB.agent
      .patch(`/api/organizations/${created.body.data.id}`)
      .send({ name: "hijacked" });
    expect(foreign.status).toBe(404);

    const patched = await userA.agent
      .patch(`/api/organizations/${created.body.data.id}`)
      .send({ name: "Renamed" });
    expect(patched.body.data.name).toBe("Renamed");
  });

  it("nulls credential links on delete (history is preserved)", async () => {
    const org = await userA.agent.post("/api/organizations").send({ name: "Doomed Org" });
    const cred = await userA.agent.post("/api/credentials").send({
      title: "Linked Credential",
      type: "INTERNSHIP",
      organizationId: org.body.data.id,
    });
    expect(cred.status).toBe(201);

    const deleted = await userA.agent.delete(`/api/organizations/${org.body.data.id}`);
    expect(deleted.status).toBe(200);

    const fetched = await userA.agent.get(`/api/credentials/${cred.body.data.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.organization).toBeNull();
    expect(fetched.body.data.title).toBe("Linked Credential");
  });

  it("filters the list by search, patches fields independently, and 404s unknown deletes", async () => {
    await userA.agent.post("/api/organizations").send({ name: "Searchable Org" });
    const hit = await userA.agent.get("/api/organizations").query({ search: "searchable" });
    expect(hit.body.data.map((o: { name: string }) => o.name)).toContain("Searchable Org");

    const created = await userA.agent.post("/api/organizations").send({ name: "Patch Org" });
    const id = created.body.data.id as string;
    const webOnly = await userA.agent.patch(`/api/organizations/${id}`).send({
      website: "https://patch.example",
    });
    expect(webOnly.status).toBe(200);
    expect(webOnly.body.data).toMatchObject({ name: "Patch Org", website: "https://patch.example" });

    const descOnly = await userA.agent.patch(`/api/organizations/${id}`).send({ description: "Nice place" });
    expect(descOnly.body.data).toMatchObject({
      name: "Patch Org",
      website: "https://patch.example",
      description: "Nice place",
    });

    const gone = await userA.agent.delete("/api/organizations/ck00000000000000000000099");
    expect(gone.status).toBe(404);
  });
});
