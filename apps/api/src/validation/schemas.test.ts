import { describe, expect, it } from "vitest";
import { maxEvidenceBytes } from "../lib/storage.js";
import { credentialQuery, idParam } from "./common.js";
import { createCredentialBody, updateCredentialBody } from "./credential.js";
import { skillHistoryQuery, timelineQuery, resumeBuildBody, portfolioBuildBody } from "./career.js";
import { credentialIdsBody, interviewPrepareBody } from "./generate.js";
import { jobsSearchBody } from "./jobs.js";
import { organizationBody, updateOrganizationBody } from "./organization.js";
import { skillBody } from "./skill.js";
import { tagBody } from "./tag.js";
import { ALLOWED_MIME_TYPES, initiateEvidenceBody } from "./evidence.js";

// z.string().cuid() needs cuid-shaped input (leading "c", no spaces/dashes).
const CUID = "ck00000000000000000000001";
const CUID2 = "ck00000000000000000000002";

describe("idParam", () => {
  it("accepts cuid ids and rejects the rest", () => {
    expect(idParam.safeParse({ id: CUID }).success).toBe(true);
    expect(idParam.safeParse({ id: "not-a-cuid!!" }).success).toBe(false);
  });
});

describe("credentialQuery", () => {
  it("applies pagination and sort defaults with string coercion", () => {
    expect(credentialQuery.parse({})).toMatchObject({ page: 1, pageSize: 20, sort: "date-desc" });
    expect(credentialQuery.parse({ page: "3", pageSize: "10" })).toMatchObject({ page: 3, pageSize: 10 });
  });

  it("rejects out-of-range paging, types, and sorts", () => {
    expect(credentialQuery.safeParse({ page: 0 }).success).toBe(false);
    expect(credentialQuery.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(credentialQuery.safeParse({ type: "NOPE" }).success).toBe(false);
    expect(credentialQuery.safeParse({ sort: "random" }).success).toBe(false);
    expect(credentialQuery.safeParse({ year: 1800 }).success).toBe(false);
  });
});

describe("credentialBody", () => {
  it("requires a title and defaults the type", () => {
    expect(createCredentialBody.parse({ title: "  SOLARIS  " })).toMatchObject({
      title: "SOLARIS",
      type: "OTHER",
    });
    expect(createCredentialBody.safeParse({ title: "   " }).success).toBe(false);
  });

  it("validates url, date, and id arrays", () => {
    expect(createCredentialBody.safeParse({ title: "T", url: "notaurl" }).success).toBe(false);
    expect(createCredentialBody.safeParse({ title: "T", url: null }).success).toBe(true);
    expect(createCredentialBody.safeParse({ title: "T", date: "yesterday" }).success).toBe(false);
    expect(
      createCredentialBody.safeParse({ title: "T", date: "2026-01-01T00:00:00Z" }).success,
    ).toBe(true);
    expect(createCredentialBody.safeParse({ title: "T", skillIds: ["bad"] }).success).toBe(false);
    expect(createCredentialBody.safeParse({ title: "T", skillIds: [CUID] }).success).toBe(true);
  });

  it("allows empty partial updates", () => {
    expect(updateCredentialBody.parse({})).toEqual({});
  });
});

describe("skillBody / tagBody", () => {
  it("trims names and rejects blanks", () => {
    expect(skillBody.parse({ name: "  Node.js " })).toEqual({ name: "Node.js" });
    expect(tagBody.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("organizationBody", () => {
  it("validates the optional website", () => {
    expect(organizationBody.safeParse({ name: "ABC", website: "notaurl" }).success).toBe(false);
    expect(organizationBody.safeParse({ name: "ABC", website: null }).success).toBe(true);
    expect(updateOrganizationBody.parse({})).toEqual({});
  });
});

describe("career queries and builders", () => {
  it("applies timeline and skill-history defaults", () => {
    expect(timelineQuery.parse({})).toMatchObject({ page: 1, pageSize: 50, sort: "date-desc" });
    expect(skillHistoryQuery.parse({})).toEqual({ sort: "count" });
    expect(timelineQuery.safeParse({ sort: "name" }).success).toBe(false);
  });

  it("bounds resume/portfolio limits", () => {
    expect(resumeBuildBody.parse({})).toMatchObject({ limit: 20 });
    expect(resumeBuildBody.safeParse({ limit: 51 }).success).toBe(false);
    expect(portfolioBuildBody.parse({})).toMatchObject({ limit: 50 });
    expect(resumeBuildBody.safeParse({ credentialIds: [CUID, "bad"] }).success).toBe(false);
  });
});

describe("generate bodies", () => {
  it("requires 1–20 credential ids, with interview defaults", () => {
    expect(credentialIdsBody.safeParse({ credentialIds: [] }).success).toBe(false);
    expect(credentialIdsBody.safeParse({ credentialIds: [CUID, CUID2] }).success).toBe(true);
    expect(interviewPrepareBody.parse({})).toMatchObject({ limit: 10 });
  });
});

describe("jobsSearchBody", () => {
  it("defaults the limit and restricts scope", () => {
    expect(jobsSearchBody.parse({ scope: "local" })).toMatchObject({ limit: 20 });
    expect(jobsSearchBody.safeParse({ scope: "moon" }).success).toBe(false);
    expect(jobsSearchBody.safeParse({ scope: "local", limit: 0 }).success).toBe(false);
  });
});

describe("initiateEvidenceBody", () => {
  it("allows listed mime types and blocks the rest", () => {
    expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
    expect(ALLOWED_MIME_TYPES).not.toContain("application/x-msdownload");
    expect(
      initiateEvidenceBody.safeParse({ fileName: "a.pdf", mimeType: "application/pdf", fileSize: 10 }).success,
    ).toBe(true);
    expect(
      initiateEvidenceBody.safeParse({ fileName: "a.exe", mimeType: "application/x-msdownload", fileSize: 10 })
        .success,
    ).toBe(false);
  });

  it("enforces a positive size within the configured limit", () => {
    // Boundary derives from the live limit (local .env may override it).
    const max = maxEvidenceBytes();
    const base = { fileName: "a.pdf", mimeType: "application/pdf" };
    expect(initiateEvidenceBody.safeParse({ ...base, fileSize: 0 }).success).toBe(false);
    expect(initiateEvidenceBody.safeParse({ ...base, fileSize: max }).success).toBe(true);
    expect(initiateEvidenceBody.safeParse({ ...base, fileSize: max + 1 }).success).toBe(false);
  });
});
