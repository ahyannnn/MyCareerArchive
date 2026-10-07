import { Prisma } from "@prisma/client";
import type { Evidence, Organization, Skill, Tag } from "@prisma/client";

// Single source of truth for credential eager-loading. Prisma.validator
// preserves literal inference so payload types stay exact.
export const credentialInclude = Prisma.validator<Prisma.CredentialInclude>()({
  organization: true,
  skills: { include: { skill: true } },
  tags: { include: { tag: true } },
  _count: { select: { evidence: true } },
});

export type CredentialWithRelations = Prisma.CredentialGetPayload<{
  include: typeof credentialInclude;
}>;

// Map Prisma rows to API DTOs so database internals (join rows, FK ids)
// never leak to clients. Keep in sync with docs/API.md.
export function serializeCredential(c: CredentialWithRelations) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type,
    date: c.date,
    location: c.location,
    url: c.url,
    organization: c.organization
      ? { id: c.organization.id, name: c.organization.name, website: c.organization.website }
      : null,
    skills: c.skills.map((s) => ({ id: s.skill.id, name: s.skill.name })),
    tags: c.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
    evidenceCount: c._count.evidence,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function serializeSkill(s: Skill & { _count?: { credentials: number } }) {
  return {
    id: s.id,
    name: s.name,
    credentialCount: s._count?.credentials,
    createdAt: s.createdAt,
  };
}

export function serializeTag(t: Tag & { _count?: { credentials: number } }) {
  return {
    id: t.id,
    name: t.name,
    credentialCount: t._count?.credentials,
    createdAt: t.createdAt,
  };
}

export function serializeOrganization(o: Organization & { _count?: { credentials: number } }) {
  return {
    id: o.id,
    name: o.name,
    website: o.website,
    description: o.description,
    credentialCount: o._count?.credentials,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function serializeEvidence(e: Evidence) {
  return {
    id: e.id,
    credentialId: e.credentialId,
    fileName: e.fileName,
    fileType: e.fileType,
    mimeType: e.mimeType,
    fileSize: e.fileSize,
    status: e.status,
    createdAt: e.createdAt,
  };
}
