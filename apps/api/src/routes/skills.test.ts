import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { authHeader, createTestUser, deleteTestUser } from "../test-utils/db.js";

const app = createApp();
let userA = "";
let userB = "";

beforeAll(async () => {
  userA = (await createTestUser("skill-a")).id;
  userB = (await createTestUser("skill-b")).id;
});

afterAll(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("skills CRUD", () => {
  it("creates and lists skills", async () => {
    const created = await request(app)
      .post("/api/skills")
      .set(authHeader(userA))
      .send({ name: "Node.js" });
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe("Node.js");

    const list = await request(app).get("/api/skills").set(authHeader(userA));
    expect(list.body.data.map((s: { name: string }) => s.name)).toContain("Node.js");
  });

  it("rejects duplicate names per user with CONFLICT", async () => {
    await request(app).post("/api/skills").set(authHeader(userA)).send({ name: "React" });
    const dup = await request(app).post("/api/skills").set(authHeader(userA)).send({ name: "React" });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("CONFLICT");

    // Same name under a different user is fine (names are per-user).
    const other = await request(app).post("/api/skills").set(authHeader(userB)).send({ name: "React" });
    expect(other.status).toBe(201);
  });

  it("renames and deletes with ownership enforcement", async () => {
    const created = await request(app)
      .post("/api/skills")
      .set(authHeader(userA))
      .send({ name: "Express" });
    const id = created.body.data.id as string;

    const foreignPatch = await request(app)
      .patch(`/api/skills/${id}`)
      .set(authHeader(userB))
      .send({ name: "hijacked" });
    expect(foreignPatch.status).toBe(404);

    const patched = await request(app)
      .patch(`/api/skills/${id}`)
      .set(authHeader(userA))
      .send({ name: "Express.js" });
    expect(patched.status).toBe(200);
    expect(patched.body.data.name).toBe("Express.js");

    const deleted = await request(app).delete(`/api/skills/${id}`).set(authHeader(userA));
    expect(deleted.status).toBe(200);
  });

  it("rejects blank names", async () => {
    const res = await request(app).post("/api/skills").set(authHeader(userA)).send({ name: "  " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});
