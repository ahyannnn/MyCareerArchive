import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { serializeCredential, credentialInclude } from "../lib/serialize.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import {
  getQuery,
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { credentialQuery, idParam, type CredentialQuery } from "../validation/common.js";
import { createCredentialBody, updateCredentialBody } from "../validation/credential.js";

export const credentialsRouter = Router();

// Ownership guard for nested references: an organization/skill/tag id is only
// usable if it belongs to the requesting user. Prevents cross-user linking.
async function assertOwnedRefs(
  userId: string,
  refs: { organizationId?: string | null; skillIds?: string[]; tagIds?: string[] },
) {
  if (refs.organizationId) {
    const org = await prisma.organization.findFirst({
      where: { id: refs.organizationId, userId },
      select: { id: true },
    });
    if (!org) throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
  if (refs.skillIds && refs.skillIds.length > 0) {
    const unique = [...new Set(refs.skillIds)];
    const count = await prisma.skill.count({ where: { id: { in: unique }, userId } });
    if (count !== unique.length) throw new AppError(404, "NOT_FOUND", "One or more skills not found");
  }
  if (refs.tagIds && refs.tagIds.length > 0) {
    const unique = [...new Set(refs.tagIds)];
    const count = await prisma.tag.count({ where: { id: { in: unique }, userId } });
    if (count !== unique.length) throw new AppError(404, "NOT_FOUND", "One or more tags not found");
  }
}

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

credentialsRouter.post(
  "/credentials",
  validateBody(createCredentialBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { skillIds = [], tagIds = [], date, organizationId, ...rest } = req.body as {
      skillIds?: string[];
      tagIds?: string[];
      date?: string | null;
      organizationId?: string | null;
      title: string;
      description?: string;
      type: "PROJECT" | "CERTIFICATE" | "SEMINAR" | "TRAINING" | "AWARD" | "COMPETITION" | "INTERNSHIP" | "ORGANIZATION" | "VOLUNTEER" | "OTHER";
      location?: string;
      url?: string | null;
    };
    await assertOwnedRefs(userId, { organizationId, skillIds, tagIds });

    const created = await prisma.credential.create({
      data: {
        ...rest,
        userId,
        organizationId: organizationId ?? null,
        date: parseDate(date) ?? null,
        skills: { create: [...new Set(skillIds)].map((skillId) => ({ skillId })) },
        tags: { create: [...new Set(tagIds)].map((tagId) => ({ tagId })) },
      },
      include: credentialInclude,
    });
    res.status(201).json({ ok: true, data: serializeCredential(created) });
  }),
);

credentialsRouter.get(
  "/credentials",
  validateQuery(credentialQuery),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const q = getQuery<CredentialQuery>(req);

    const where: Prisma.CredentialWhereInput = { userId };
    if (q.type) where.type = q.type;
    if (q.organizationId) where.organizationId = q.organizationId;
    if (q.year) {
      where.date = { gte: new Date(Date.UTC(q.year, 0, 1)), lt: new Date(Date.UTC(q.year + 1, 0, 1)) };
    }
    if (q.skill) {
      where.skills = { some: { skill: { name: { contains: q.skill, mode: "insensitive" } } } };
    }
    if (q.tag) {
      where.tags = { some: { tag: { name: { contains: q.tag, mode: "insensitive" } } } };
    }
    if (q.search) {
      const contains = { contains: q.search, mode: "insensitive" as const };
      where.AND = [
        {
          OR: [
            { title: contains },
            { description: contains },
            { location: contains },
            { organization: { name: contains } },
            { skills: { some: { skill: { name: contains } } } },
            { tags: { some: { tag: { name: contains } } } },
          ],
        },
      ];
    }

    const orderBy: Prisma.CredentialOrderByWithRelationInput =
      q.sort === "date-asc"
        ? { date: { sort: "asc", nulls: "last" } }
        : q.sort === "created-desc"
          ? { createdAt: "desc" }
          : q.sort === "created-asc"
            ? { createdAt: "asc" }
            : { date: { sort: "desc", nulls: "last" } };

    const [total, rows] = await prisma.$transaction([
      prisma.credential.count({ where }),
      prisma.credential.findMany({
        where,
        include: credentialInclude,
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);

    res.json({
      ok: true,
      data: rows.map(serializeCredential),
      meta: { page: q.page, pageSize: q.pageSize, total },
    });
  }),
);

credentialsRouter.get(
  "/credentials/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const found = await prisma.credential.findFirst({
      where: { id: req.params.id, userId },
      include: credentialInclude,
    });
    if (!found) throw new AppError(404, "NOT_FOUND", "Credential not found");
    res.json({ ok: true, data: serializeCredential(found) });
  }),
);

credentialsRouter.patch(
  "/credentials/:id",
  validateParams(idParam),
  validateBody(updateCredentialBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    const { skillIds, tagIds, date, organizationId, ...scalars } = req.body as {
      skillIds?: string[];
      tagIds?: string[];
      date?: string | null;
      organizationId?: string | null;
      title?: string;
      description?: string;
      type?: "PROJECT" | "CERTIFICATE" | "SEMINAR" | "TRAINING" | "AWARD" | "COMPETITION" | "INTERNSHIP" | "ORGANIZATION" | "VOLUNTEER" | "OTHER";
      location?: string;
      url?: string | null;
    };

    const existing = await prisma.credential.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Credential not found");
    await assertOwnedRefs(userId, { organizationId, skillIds, tagIds });

    const data: Prisma.CredentialUpdateInput = { ...scalars };
    if (date !== undefined) data.date = parseDate(date);
    // Scalar FK is hidden behind the relation in UpdateInput: use connect/disconnect.
    if (organizationId !== undefined) {
      data.organization = organizationId === null ? { disconnect: true } : { connect: { id: organizationId } };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Replace semantics: provided arrays fully replace links, omitted = untouched.
      if (skillIds !== undefined) {
        await tx.credentialSkill.deleteMany({ where: { credentialId: id } });
        const unique = [...new Set(skillIds)];
        if (unique.length > 0) {
          await tx.credentialSkill.createMany({
            data: unique.map((skillId) => ({ credentialId: id, skillId })),
          });
        }
      }
      if (tagIds !== undefined) {
        await tx.credentialTag.deleteMany({ where: { credentialId: id } });
        const unique = [...new Set(tagIds)];
        if (unique.length > 0) {
          await tx.credentialTag.createMany({
            data: unique.map((tagId) => ({ credentialId: id, tagId })),
          });
        }
      }
      return tx.credential.update({ where: { id }, data, include: credentialInclude });
    });

    res.json({ ok: true, data: serializeCredential(updated) });
  }),
);

credentialsRouter.delete(
  "/credentials/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const result = await prisma.credential.deleteMany({ where: { id: req.params.id, userId } });
    if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Credential not found");
    res.json({ ok: true });
  }),
);
