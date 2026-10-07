import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../index.js";
import { __resetStorageForTests } from "../lib/storage.js";
import { prisma } from "../prisma.js";
import {
  createTestAgent,
  deleteTestUser,
  type TestAgent,
} from "../test-utils/db.js";

// Phase 5 evidence flows. Storage is fully mocked (aws-sdk-client-mock):
// presigned URLs are real local signatures (no network), while Head/Delete
// go through the mock — so this suite proves our logic, never the provider.
// Both drivers (R2 default + Supabase S3) are covered via STORAGE_DRIVER.
const app = createApp();
const s3Mock = mockClient(S3Client);
let userA!: TestAgent;
let userB!: TestAgent;
let credentialId = "";

const PDF = { fileName: "certificate.pdf", mimeType: "application/pdf", fileSize: 1024 };

beforeAll(async () => {
  userA = await createTestAgent(app, "ev-a");
  userB = await createTestAgent(app, "ev-b");
  const created = await userA.agent.post("/api/credentials").send({
    title: "Evidence Vessel",
    type: "CERTIFICATE",
  });
  credentialId = created.body.data.id as string;
});

afterAll(async () => {
  s3Mock.restore();
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
});

beforeEach(() => {
  s3Mock.reset();
  s3Mock.on(DeleteObjectCommand).resolves({});
});

async function initiate(
  agent: TestAgent["agent"],
  credId: string,
  body: Record<string, unknown> = PDF,
) {
  return agent.post(`/api/credentials/${credId}/evidence/initiate`).send(body);
}

describe("evidence initiate", () => {
  it("reserves a PENDING row and returns a signed upload URL", async () => {
    const res = await initiate(userA.agent, credentialId);
    expect(res.status).toBe(201);
    expect(res.body.data.evidence.status).toBe("PENDING");
    expect(res.body.data.evidence.mimeType).toBe("application/pdf");
    expect(res.body.data.evidence.fileType).toBe("pdf");
    // Key namespaced to the owner; URL targets our bucket.
    expect(res.body.data.evidence.id).toBeDefined();
    expect(res.body.data.uploadUrl).toContain("test-bucket");
    expect(res.body.data.uploadUrl).toContain(`users/${userA.userId}/evidence/`);
    expect(res.body.data.expiresIn).toBe(900);
  });

  it("rejects disallowed types, oversize declarations, and bad input", async () => {
    const badType = await initiate(userA.agent, credentialId, {
      ...PDF,
      mimeType: "application/x-msdownload",
    });
    expect(badType.status).toBe(400);

    const tooBig = await initiate(userA.agent, credentialId, {
      ...PDF,
      fileSize: 26 * 1024 * 1024,
    });
    expect(tooBig.status).toBe(400);

    const noName = await initiate(userA.agent, credentialId, { ...PDF, fileName: "  " });
    expect(noName.status).toBe(400);
  });

  it("rejects foreign credentials and anonymous callers", async () => {
    const foreign = await initiate(userB.agent, credentialId);
    expect(foreign.status).toBe(404);

    const anon = await request(app)
      .post(`/api/credentials/${credentialId}/evidence/initiate`)
      .send(PDF);
    expect(anon.status).toBe(401);
  });

  it("returns 503 when storage is unconfigured", async () => {
    __resetStorageForTests();
    const saved = process.env.R2_BUCKET;
    delete process.env.R2_BUCKET;
    try {
      const res = await initiate(userA.agent, credentialId);
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("STORAGE_UNCONFIGURED");
    } finally {
      process.env.R2_BUCKET = saved;
      __resetStorageForTests();
    }
  });
});

describe("evidence complete", () => {
  it("confirms upload with the REAL size from storage", async () => {
    const started = await initiate(userA.agent, credentialId, { ...PDF, fileSize: 100 });
    const id = started.body.data.evidence.id as string;
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 1234, ContentType: "application/pdf" });

    const res = await userA.agent.post(`/api/evidence/${id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UPLOADED");
    // Declared 100, actually 1234: storage wins.
    expect(res.body.data.fileSize).toBe(1234);
  });

  it("fails cleanly when nothing was uploaded", async () => {
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;
    s3Mock.on(HeadObjectCommand).rejects(Object.assign(new Error("Not Found"), { name: "NotFound" }));

    const res = await userA.agent.post(`/api/evidence/${id}/complete`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("FILE_NOT_UPLOADED");
    const row = await prisma.evidence.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("FAILED");
  });

  it("deletes oversized objects and marks FAILED", async () => {
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 30 * 1024 * 1024 });

    const res = await userA.agent.post(`/api/evidence/${id}/complete`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("FILE_TOO_LARGE");
    expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);
    const row = await prisma.evidence.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("FAILED");
  });

  it("is idempotent on already-uploaded rows", async () => {
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 512 });
    await userA.agent.post(`/api/evidence/${id}/complete`);
    const again = await userA.agent.post(`/api/evidence/${id}/complete`);
    expect(again.status).toBe(200);
    expect(again.body.data.status).toBe("UPLOADED");
  });

  it("rejects foreign evidence", async () => {
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;
    const res = await userB.agent.post(`/api/evidence/${id}/complete`);
    expect(res.status).toBe(404);
  });
});

describe("evidence list, download, delete", () => {
  it("lists a credential's evidence newest-first", async () => {
    await initiate(userA.agent, credentialId, { ...PDF, fileName: "a.pdf" });
    await initiate(userA.agent, credentialId, { ...PDF, fileName: "b.pdf" });
    const res = await userA.agent.get(`/api/credentials/${credentialId}/evidence`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].fileName).toBe("b.pdf");
  });

  it("issues download URLs only for uploaded files", async () => {
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 100 });
    const started = await initiate(userA.agent, credentialId);
    const pendingId = started.body.data.evidence.id as string;

    const pendingUrl = await userA.agent.get(`/api/evidence/${pendingId}/url`);
    expect(pendingUrl.status).toBe(404);

    await userA.agent.post(`/api/evidence/${pendingId}/complete`);
    const res = await userA.agent.get(`/api/evidence/${pendingId}/url`);
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain("test-bucket");
    expect(res.body.data.expiresIn).toBe(3600);
  });

  it("deletes the object and the row", async () => {
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 100 });
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;
    await userA.agent.post(`/api/evidence/${id}/complete`);

    const deleted = await userA.agent.delete(`/api/evidence/${id}`);
    expect(deleted.status).toBe(200);
    expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);
    const key = (s3Mock.commandCalls(DeleteObjectCommand)[0].args[0].input as { Key: string }).Key;
    expect(key.startsWith(`users/${userA.userId}/evidence/`)).toBe(true);
    expect(key.endsWith("/certificate.pdf")).toBe(true);
    await expect(prisma.evidence.findUnique({ where: { id } })).resolves.toBeNull();
  });

  it("rejects foreign deletes", async () => {
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;
    const res = await userB.agent.delete(`/api/evidence/${id}`);
    expect(res.status).toBe(404);
    // Untouched: no delete attempted, row survives.
    expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(0);
    await prisma.evidence.delete({ where: { id } });
  });
});

describe("evidence storage driver: supabase (S3 protocol)", () => {
  beforeEach(() => {
    __resetStorageForTests();
    process.env.STORAGE_DRIVER = "supabase";
    __resetStorageForTests();
  });

  afterAll(() => {
    process.env.STORAGE_DRIVER = "r2";
    __resetStorageForTests();
  });

  it("reserves a PENDING row and signs against the Supabase bucket", async () => {
    const res = await initiate(userA.agent, credentialId);
    expect(res.status).toBe(201);
    expect(res.body.data.evidence.status).toBe("PENDING");
    expect(res.body.data.uploadUrl).toContain("test-supabase-bucket");
    expect(res.body.data.uploadUrl).toContain(`users/${userA.userId}/evidence/`);
  });

  it("completes and downloads via the Supabase driver", async () => {
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 777, ContentType: "application/pdf" });
    const started = await initiate(userA.agent, credentialId);
    const id = started.body.data.evidence.id as string;

    const completed = await userA.agent.post(`/api/evidence/${id}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.data.fileSize).toBe(777);

    const url = await userA.agent.get(`/api/evidence/${id}/url`);
    expect(url.status).toBe(200);
    expect(url.body.data.url).toContain("test-supabase-bucket");

    await userA.agent.delete(`/api/evidence/${id}`);
  });

  it("returns 503 when the Supabase bucket is unconfigured", async () => {
    __resetStorageForTests();
    const saved = process.env.SUPABASE_S3_BUCKET;
    delete process.env.SUPABASE_S3_BUCKET;
    try {
      const res = await initiate(userA.agent, credentialId);
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("STORAGE_UNCONFIGURED");
    } finally {
      process.env.SUPABASE_S3_BUCKET = saved;
      __resetStorageForTests();
    }
  });
});
