import { describe, expect, it } from "vitest";
import type { CredentialWithRelations } from "./serialize.js";
import {
  serializeCredential,
  serializeEvidence,
  serializeOrganization,
  serializeSkill,
  serializeTag,
} from "./serialize.js";

function credentialRow(overrides: Record<string, unknown> = {}): CredentialWithRelations {
  return {
    id: "cred-1",
    userId: "user-1",
    title: "SOLARIS",
    description: "Solar pre-assessment system",
    type: "PROJECT",
    organizationId: "org-1",
    date: new Date("2026-03-01T00:00:00Z"),
    location: "Manila",
    url: "https://example.com/solaris",
    organization: { id: "org-1", name: "ABC Tech", website: "https://abc.example" },
    skills: [{ skill: { id: "skill-1", name: "Node.js" } }],
    tags: [{ tag: { id: "tag-1", name: "capstone" } }],
    _count: { evidence: 2 },
    evidence: [{ id: "ev-1", mimeType: "image/png" }],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
    ...overrides,
  } as unknown as CredentialWithRelations;
}

describe("serializeCredential", () => {
  it("maps relations to DTOs and picks the cover image", () => {
    const dto = serializeCredential(credentialRow());
    expect(dto.id).toBe("cred-1");
    expect(dto.organization).toEqual({ id: "org-1", name: "ABC Tech", website: "https://abc.example" });
    expect(dto.skills).toEqual([{ id: "skill-1", name: "Node.js" }]);
    expect(dto.tags).toEqual([{ id: "tag-1", name: "capstone" }]);
    expect(dto.evidenceCount).toBe(2);
    expect(dto.preview).toEqual({ evidenceId: "ev-1", mimeType: "image/png" });
  });

  it("nulls the organization and preview when absent", () => {
    const dto = serializeCredential(credentialRow({ organization: null, evidence: [] }));
    expect(dto.organization).toBeNull();
    expect(dto.preview).toBeNull();
  });

  it("never leaks database internals", () => {
    const dto = serializeCredential(credentialRow());
    expect(dto).not.toHaveProperty("userId");
    expect(dto).not.toHaveProperty("organizationId");
    expect(dto).not.toHaveProperty("_count");
    expect(dto).not.toHaveProperty("evidence");
  });
});

describe("serializeSkill / serializeTag / serializeOrganization", () => {
  it("includes the credential count when present, undefined otherwise", () => {
    expect(
      serializeSkill({ id: "s", name: "Node.js", createdAt: new Date(), _count: { credentials: 5 } } as never)
        .credentialCount,
    ).toBe(5);
    expect(
      serializeTag({ id: "t", name: "capstone", createdAt: new Date() } as never).credentialCount,
    ).toBeUndefined();
  });

  it("maps organization fields without leaking internals", () => {
    const dto = serializeOrganization({
      id: "o",
      userId: "user-1",
      name: "ABC",
      website: null,
      description: "d",
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { credentials: 2 },
    } as never);
    expect(dto).toMatchObject({ id: "o", name: "ABC", website: null, credentialCount: 2 });
    expect(dto).not.toHaveProperty("userId");
    expect(dto).not.toHaveProperty("_count");
  });
});

describe("serializeEvidence", () => {
  it("exposes metadata but never the storage key", () => {
    const dto = serializeEvidence({
      id: "ev-1",
      credentialId: "cred-1",
      fileName: "cert.pdf",
      fileType: "DOCUMENT",
      mimeType: "application/pdf",
      fileSize: 123,
      storageKey: "users/user-1/evidence/x/cert.pdf",
      status: "UPLOADED",
      createdAt: new Date(),
    } as never);
    expect(dto).toMatchObject({ id: "ev-1", fileName: "cert.pdf", status: "UPLOADED" });
    expect(dto).not.toHaveProperty("storageKey");
  });
});
