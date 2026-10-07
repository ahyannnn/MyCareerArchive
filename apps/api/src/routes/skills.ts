import { Router } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { serializeSkill } from "../lib/serialize.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { validateBody, validateParams, validateQuery, getQuery } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { idParam } from "../validation/common.js";
import { skillBody } from "../validation/skill.js";

export const skillsRouter = Router();

const skillListQuery = z.object({
  search: z.string().trim().max(100).optional(),
});

skillsRouter.get(
  "/skills",
  validateQuery(skillListQuery),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { search } = getQuery<{ search?: string }>(req);
    const rows = await prisma.skill.findMany({
      where: {
        userId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: { _count: { select: { credentials: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ ok: true, data: rows.map(serializeSkill) });
  }),
);

skillsRouter.post(
  "/skills",
  validateBody(skillBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const created = await prisma.skill.create({
      data: { userId, name: (req.body as { name: string }).name },
      include: { _count: { select: { credentials: true } } },
    });
    res.status(201).json({ ok: true, data: serializeSkill(created) });
  }),
);

skillsRouter.patch(
  "/skills/:id",
  validateParams(idParam),
  validateBody(skillBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const existing = await prisma.skill.findFirst({
      where: { id: req.params.id, userId },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Skill not found");
    const updated = await prisma.skill.update({
      where: { id: req.params.id },
      data: { name: (req.body as { name: string }).name },
      include: { _count: { select: { credentials: true } } },
    });
    res.json({ ok: true, data: serializeSkill(updated) });
  }),
);

skillsRouter.delete(
  "/skills/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const result = await prisma.skill.deleteMany({ where: { id: req.params.id, userId } });
    if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Skill not found");
    res.json({ ok: true });
  }),
);
