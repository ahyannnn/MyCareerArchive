import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { createTestAgent, deleteTestUser, type TestAgent } from "../test-utils/db.js";

const app = createApp();
let userA!: TestAgent;
let userB!: TestAgent;

beforeAll(async () => {
  userA = await createTestAgent(app, "skill-a");
  userB = await createTestAgent(app, "skill-b");
});

afterAll(async () => {
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
});

describe("skills CRUD", () => {
  it("creates and lists skills", async () => {
    const created = await userA.agent.post("/api/skills").send({ name: "Node.js" });
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe("Node.js");

    const list = await userA.agent.get("/api/skills");
    expect(list.body.data.map((s: { name: string }) => s.name)).toContain("Node.js");
  });

  it("rejects duplicate names per user with CONFLICT", async () => {
    await userA.agent.post("/api/skills").send({ name: "React" });
    const dup = await userA.agent.post("/api/skills").send({ name: "React" });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("CONFLICT");

    // Same name under a different user is fine (names are per-user).
    const other = await userB.agent.post("/api/skills").send({ name: "React" });
    expect(other.status).toBe(201);
  });

  it("renames and deletes with ownership enforcement", async () => {
    const created = await userA.agent.post("/api/skills").send({ name: "Express" });
    const id = created.body.data.id as string;

    const foreignPatch = await userB.agent.patch(`/api/skills/${id}`).send({ name: "hijacked" });
    expect(foreignPatch.status).toBe(404);

    const patched = await userA.agent.patch(`/api/skills/${id}`).send({ name: "Express.js" });
    expect(patched.status).toBe(200);
    expect(patched.body.data.name).toBe("Express.js");

    const deleted = await userA.agent.delete(`/api/skills/${id}`);
    expect(deleted.status).toBe(200);
  });

  it("rejects blank names", async () => {
    const res = await userA.agent.post("/api/skills").send({ name: "  " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});
