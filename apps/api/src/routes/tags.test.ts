import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { authHeader, createTestUser, deleteTestUser } from "../test-utils/db.js";

const app = createApp();
let userA = "";
let userB = "";

beforeAll(async () => {
  userA = (await createTestUser("tag-a")).id;
  userB = (await createTestUser("tag-b")).id;
});

afterAll(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("tags CRUD", () => {
  it("creates, lists, and deletes tags", async () => {
    const created = await request(app)
      .post("/api/tags")
      .set(authHeader(userA))
      .send({ name: "portfolio" });
    expect(created.status).toBe(201);

    const list = await request(app).get("/api/tags").set(authHeader(userA));
    expect(list.body.data.map((t: { name: string }) => t.name)).toContain("portfolio");

    const deleted = await request(app)
      .delete(`/api/tags/${created.body.data.id}`)
      .set(authHeader(userA));
    expect(deleted.status).toBe(200);
  });

  it("rejects duplicates per user with CONFLICT", async () => {
    await request(app).post("/api/tags").set(authHeader(userA)).send({ name: "capstone" });
    const dup = await request(app).post("/api/tags").set(authHeader(userA)).send({ name: "capstone" });
    expect(dup.status).toBe(409);
  });

  it("enforces ownership on delete", async () => {
    const created = await request(app)
      .post("/api/tags")
      .set(authHeader(userA))
      .send({ name: "private-tag" });
    const foreign = await request(app)
      .delete(`/api/tags/${created.body.data.id}`)
      .set(authHeader(userB));
    expect(foreign.status).toBe(404);
  });

  it("has no update endpoint by design (tags are rename-by-recreate)", async () => {
    const created = await request(app)
      .post("/api/tags")
      .set(authHeader(userA))
      .send({ name: "immutable-tag" });
    const res = await request(app)
      .patch(`/api/tags/${created.body.data.id}`)
      .set(authHeader(userA))
      .send({ name: "changed" });
    expect(res.status).toBe(404);
  });
});
