import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { createTestAgent, deleteTestUser, type TestAgent } from "../test-utils/db.js";

const app = createApp();
let userA!: TestAgent;
let userB!: TestAgent;

beforeAll(async () => {
  userA = await createTestAgent(app, "tag-a");
  userB = await createTestAgent(app, "tag-b");
});

afterAll(async () => {
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
});

describe("tags CRUD", () => {
  it("creates, lists, and deletes tags", async () => {
    const created = await userA.agent.post("/api/tags").send({ name: "portfolio" });
    expect(created.status).toBe(201);

    const list = await userA.agent.get("/api/tags");
    expect(list.body.data.map((t: { name: string }) => t.name)).toContain("portfolio");

    const deleted = await userA.agent.delete(`/api/tags/${created.body.data.id}`);
    expect(deleted.status).toBe(200);
  });

  it("rejects duplicates per user with CONFLICT", async () => {
    await userA.agent.post("/api/tags").send({ name: "capstone" });
    const dup = await userA.agent.post("/api/tags").send({ name: "capstone" });
    expect(dup.status).toBe(409);
  });

  it("enforces ownership on delete", async () => {
    const created = await userA.agent.post("/api/tags").send({ name: "private-tag" });
    const foreign = await userB.agent.delete(`/api/tags/${created.body.data.id}`);
    expect(foreign.status).toBe(404);
  });

  it("has no update endpoint by design (tags are rename-by-recreate)", async () => {
    const created = await userA.agent.post("/api/tags").send({ name: "immutable-tag" });
    const res = await userA.agent.patch(`/api/tags/${created.body.data.id}`).send({ name: "changed" });
    expect(res.status).toBe(404);
  });
});
