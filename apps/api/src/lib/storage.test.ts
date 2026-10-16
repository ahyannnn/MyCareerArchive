import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetStorageForTests,
  activeDriver,
  deleteObject,
  evidenceKey,
  headObject,
  isStorageConfigured,
  maxEvidenceBytes,
  presignDownload,
  presignUpload,
} from "./storage.js";

const s3Mock = mockClient(S3Client);

const ENV_KEYS = [
  "STORAGE_DRIVER",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "SUPABASE_S3_ENDPOINT",
  "SUPABASE_S3_REGION",
  "SUPABASE_S3_ACCESS_KEY_ID",
  "SUPABASE_S3_SECRET_ACCESS_KEY",
  "SUPABASE_S3_BUCKET",
  "EVIDENCE_MAX_MB",
] as const;

let savedEnv: Record<string, string | undefined>;

function clearStorageEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  clearStorageEnv();
  __resetStorageForTests();
  s3Mock.reset();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  __resetStorageForTests();
  s3Mock.reset();
});

function setR2Env() {
  process.env.STORAGE_DRIVER = "r2";
  process.env.R2_ACCOUNT_ID = "acct";
  process.env.R2_ACCESS_KEY_ID = "key";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET = "bucket";
}

describe("maxEvidenceBytes", () => {
  it("defaults to 25 MB", () => {
    expect(maxEvidenceBytes()).toBe(25 * 1024 * 1024);
  });

  it("honors EVIDENCE_MAX_MB and falls back on invalid values", () => {
    process.env.EVIDENCE_MAX_MB = "10";
    expect(maxEvidenceBytes()).toBe(10 * 1024 * 1024);
    for (const bad of ["0", "-5", "abc", ""]) {
      process.env.EVIDENCE_MAX_MB = bad;
      expect(maxEvidenceBytes()).toBe(25 * 1024 * 1024);
    }
  });
});

describe("activeDriver", () => {
  it("honors an explicit driver (case-insensitive)", () => {
    process.env.STORAGE_DRIVER = "Supabase";
    expect(activeDriver()).toBe("supabase");
    process.env.STORAGE_DRIVER = "R2";
    expect(activeDriver()).toBe("r2");
  });

  it("auto-detects supabase when fully configured, else falls back to r2", () => {
    process.env.SUPABASE_S3_ENDPOINT = "https://x.supabase.co/storage/v1/s3";
    process.env.SUPABASE_S3_REGION = "us-east-1";
    process.env.SUPABASE_S3_ACCESS_KEY_ID = "k";
    process.env.SUPABASE_S3_SECRET_ACCESS_KEY = "s";
    process.env.SUPABASE_S3_BUCKET = "evidence";
    expect(activeDriver()).toBe("supabase");
    delete process.env.SUPABASE_S3_BUCKET;
    expect(activeDriver()).toBe("r2");
  });
});

describe("isStorageConfigured", () => {
  it("reflects the active driver's completeness", () => {
    setR2Env();
    expect(isStorageConfigured()).toBe(true);
    delete process.env.R2_BUCKET;
    expect(isStorageConfigured()).toBe(false);
  });
});

describe("evidenceKey", () => {
  it("namespaces per user and strips path traversal", () => {
    expect(evidenceKey("u1", "rand", "../../etc/passwd")).toBe("users/u1/evidence/rand/passwd");
  });

  it("sanitizes unsafe characters, truncates, and defaults empties", () => {
    expect(evidenceKey("u1", "r", "my cert (1).pdf")).toBe("users/u1/evidence/r/my_cert__1_.pdf");
    expect(evidenceKey("u1", "r", "x".repeat(200))).toHaveLength("users/u1/evidence/r/".length + 100);
    expect(evidenceKey("u1", "r", "???")).toBe("users/u1/evidence/r/___");
    expect(evidenceKey("u1", "r", "")).toBe("users/u1/evidence/r/file");
  });
});

describe("presigning", () => {
  it("throws STORAGE_UNCONFIGURED when the driver has no bucket", async () => {
    process.env.STORAGE_DRIVER = "r2";
    await expect(presignUpload("k", "application/pdf")).rejects.toMatchObject({
      statusCode: 503,
      code: "STORAGE_UNCONFIGURED",
    });
  });

  it("throws STORAGE_UNCONFIGURED when the cached client outlives its bucket var", async () => {
    process.env.STORAGE_DRIVER = "supabase";
    process.env.SUPABASE_S3_ENDPOINT = "https://x.supabase.co/storage/v1/s3";
    process.env.SUPABASE_S3_REGION = "us-east-1";
    process.env.SUPABASE_S3_ACCESS_KEY_ID = "k";
    process.env.SUPABASE_S3_SECRET_ACCESS_KEY = "s";
    process.env.SUPABASE_S3_BUCKET = "evidence";
    await presignDownload("k"); // caches the client
    delete process.env.SUPABASE_S3_BUCKET;
    await expect(presignDownload("k")).rejects.toMatchObject({ code: "STORAGE_UNCONFIGURED" });
  });

  it("signs upload and download URLs offline with dummy credentials", async () => {
    setR2Env();
    const put = await presignUpload("users/u1/evidence/r/cert.pdf", "application/pdf");
    expect(put).toContain("bucket.acct.r2.cloudflarestorage.com");
    expect(put).toContain("users/u1/evidence/r/cert.pdf");
    const get = await presignDownload("users/u1/evidence/r/cert.pdf");
    expect(get).toContain("bucket.acct.r2.cloudflarestorage.com");
    expect(get).toContain("users/u1/evidence/r/cert.pdf");
  });
});

describe("headObject", () => {
  it("returns null for missing objects and metadata when present", async () => {
    setR2Env();
    s3Mock.on(HeadObjectCommand).rejects(Object.assign(new Error("Not Found"), { name: "NotFound" }));
    await expect(headObject("missing")).resolves.toBeNull();
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 10, ContentType: "application/pdf" });
    await expect(headObject("present")).resolves.toEqual({ size: 10, contentType: "application/pdf" });
  });

  it("rethrows real storage errors", async () => {
    setR2Env();
    s3Mock.on(HeadObjectCommand).rejects(new Error("AccessDenied"));
    await expect(headObject("x")).rejects.toThrow("AccessDenied");
  });
});

describe("deleteObject", () => {
  it("is idempotent on missing objects and rethrows real errors", async () => {
    setR2Env();
    s3Mock.on(DeleteObjectCommand).rejects(Object.assign(new Error("Gone"), { name: "NoSuchKey" }));
    await expect(deleteObject("missing")).resolves.toBeUndefined();
    s3Mock.on(DeleteObjectCommand).rejects(new Error("AccessDenied"));
    await expect(deleteObject("x")).rejects.toThrow("AccessDenied");
  });
});
