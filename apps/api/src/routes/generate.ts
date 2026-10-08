import type { Prisma } from "@prisma/client";
import { Router } from "express";
import {
  buildInterviewQuestions,
  buildPortfolioDescription,
  buildResumeBullets,
} from "../lib/generate.js";
import { serializeCredential, credentialInclude } from "../lib/serialize.js";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { validateBody } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import {
  credentialIdsBody,
  interviewPrepareBody,
  type CredentialIdsBody,
  type InterviewPrepareBody,
} from "../validation/generate.js";

export const generateRouter = Router();

async function ownedCredentials(userId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  const rows = await prisma.credential.findMany({
    where: { id: { in: unique }, userId },
    include: credentialInclude,
  });
  if (rows.length !== unique.length) {
    throw new AppError(404, "NOT_FOUND", "One or more credentials not found");
  }
  const order = new Map(unique.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function evidenceNamesByCredential(credentialIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (credentialIds.length === 0) return map;
  const rows = await prisma.evidence.findMany({
    where: { credentialId: { in: credentialIds }, status: "UPLOADED" },
    select: { credentialId: true, fileName: true },
    orderBy: { createdAt: "asc" },
  });
  for (const r of rows) {
    const list = map.get(r.credentialId) ?? [];
    list.push(r.fileName);
    map.set(r.credentialId, list);
  }
  return map;
}

generateRouter.post(
  "/resume/bullets",
  validateBody(credentialIdsBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { credentialIds } = req.body as CredentialIdsBody;
    const rows = await ownedCredentials(userId, credentialIds);
    res.json({
      ok: true,
      data: rows.map((r) => {
        const c = serializeCredential(r);
        return { credentialId: c.id, title: c.title, lines: buildResumeBullets(c) };
      }),
    });
  }),
);

generateRouter.post(
  "/portfolio/describe",
  validateBody(credentialIdsBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { credentialIds } = req.body as CredentialIdsBody;
    const rows = await ownedCredentials(userId, credentialIds);
    const names = await evidenceNamesByCredential(rows.map((r) => r.id));
    res.json({
      ok: true,
      data: rows.map((r) => {
        const c = serializeCredential(r);
        return {
          credentialId: c.id,
          title: c.title,
          paragraphs: buildPortfolioDescription(c, names.get(c.id) ?? []),
        };
      }),
    });
  }),
);

generateRouter.post(
  "/interviews/prepare",
  validateBody(interviewPrepareBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const body = req.body as InterviewPrepareBody;

    let rows: Awaited<ReturnType<typeof ownedCredentials>>;
    if (body.credentialIds && body.credentialIds.length > 0) {
      rows = await ownedCredentials(userId, body.credentialIds);
    } else {
      const where: Prisma.CredentialWhereInput = { userId };
      if (body.skill) {
        where.skills = { some: { skill: { name: { contains: body.skill, mode: "insensitive" as const } } } };
      }
      rows = await prisma.credential.findMany({
        where,
        include: credentialInclude,
        orderBy: [{ date: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: 20,
      });
    }

    const names = await evidenceNamesByCredential(rows.map((r) => r.id));
    const questions = rows.flatMap((r) => {
      const c = serializeCredential(r);
      return buildInterviewQuestions(c, names.get(c.id) ?? []).map((q) => ({
        credentialId: c.id,
        credentialTitle: c.title,
        ...q,
      }));
    }).slice(0, body.limit);

    res.json({ ok: true, data: { questions, totalCredentials: rows.length } });
  }),
);
