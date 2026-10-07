import { Router } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { serializeTag } from "../lib/serialize.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { validateBody, validateParams, validateQuery, getQuery } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { idParam } from "../validation/common.js";
import { tagBody } from "../validation/tag.js";

export const tagsRouter = Router();

const tagListQuery = z.object({
  search: z.string().trim().max(100).optional(),
});

tagsRouter.get(
  "/tags",
  validateQuery(tagListQuery),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { search } = getQuery<{ search?: string }>(req);
    const rows = await prisma.tag.findMany({
      where: {
        userId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: { _count: { select: { credentials: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ ok: true, data: rows.map(serializeTag) });
  }),
);

tagsRouter.post(
  "/tags",
  validateBody(tagBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const created = await prisma.tag.create({
      data: { userId, name: (req.body as { name: string }).name },
      include: { _count: { select: { credentials: true } } },
    });
    res.status(201).json({ ok: true, data: serializeTag(created) });
  }),
);

tagsRouter.delete(
  "/tags/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const result = await prisma.tag.deleteMany({ where: { id: req.params.id, userId } });
    if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Tag not found");
    res.json({ ok: true });
  }),
);
