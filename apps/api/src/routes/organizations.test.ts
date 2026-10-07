import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { authHeader, createTestUser, deleteTestUser } from "../test-utils/db.js";

const app = createApp();
let userA = "";
let userB = "";

beforeAll(async () => {
  userA = (await createTestUser("org-a")).id;
  userB = (await createTestUser("org-b")).id;
});

afterAll(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("organizations CRUD", () => {
  it("creates with website and lists with counts", async () => {
    const created = await request(app).post("/api/organizations").set(authHeader(userA)).send({
      name: "ABC Tech",
      website: "https://example.com",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.website).toBe("https://example.com");
    expect(created.body.data.credentialCount).toBe(0);

    const list = await request(app).get("/api/organizations").set(authHeader(userA));
    expect(list.body.data.map((o: { name: string }) => o.name)).toContain("ABC Tech");
  });

  it("rejects invalid website URLs", async () => {
    const res = await request(app)
      .post("/api/organizations")
      .set(authHeader(userA))
      .send({ name: "Bad Org", website: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("renames with ownership enforcement", async () => {
    const created = await request(app)
      .post("/api/organizations")
      .set(authHeader(userA))
      .send({ name: "Rename Me" });

    const foreign = await request(app)
      .patch(`/api/organizations/${created.body.data.id}`)
      .set(authHeader(userB))
      .send({ name: "hijacked" });
    expect(foreign.status).toBe(404);

    const patched = await request(app)
      .patch(`/api/organizations/${created.body.data.id}`)
      .set(authHeader(userA))
      .send({ name: "Renamed" });
    expect(patched.body.data.name).toBe("Renamed");
  });

  it("nulls credential links on delete (history is preserved)", async () => {
    const org = await request(app).post("/api/organizations").set(authHeader(userA)).send({
      name: "Doomed Org",
    });
    const cred = await request(app).post("/api/credentials").set(authHeader(userA)).send({
      title: "Linked Credential",
      type: "INTERNSHIP",
      organizationId: org.body.data.id,
    });
    expect(cred.status).toBe(201);

    const deleted = await request(app)
      .delete(`/api/organizations/${org.body.data.id}`)
      .set(authHeader(userA));
    expect(deleted.status).toBe(200);

    const fetched = await request(app)
      .get(`/api/credentials/${cred.body.data.id}`)
      .set(authHeader(userA));
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.organization).toBeNull();
    expect(fetched.body.data.title).toBe("Linked Credential");
  });
});
