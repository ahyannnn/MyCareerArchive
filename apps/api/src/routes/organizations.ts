import { Router } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { serializeOrganization } from "../lib/serialize.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { validateBody, validateParams, validateQuery, getQuery } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { idParam } from "../validation/common.js";
import { organizationBody, updateOrganizationBody } from "../validation/organization.js";

export const organizationsRouter = Router();

const organizationListQuery = z.object({
  search: z.string().trim().max(200).optional(),
});

organizationsRouter.get(
  "/organizations",
  validateQuery(organizationListQuery),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { search } = getQuery<{ search?: string }>(req);
    const rows = await prisma.organization.findMany({
      where: {
        userId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: { _count: { select: { credentials: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ ok: true, data: rows.map(serializeOrganization) });
  }),
);

organizationsRouter.post(
  "/organizations",
  validateBody(organizationBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const { name, website, description } = req.body as {
      name: string;
      website?: string | null;
      description?: string;
    };
    const created = await prisma.organization.create({
      data: { userId, name, website: website ?? null, description },
      include: { _count: { select: { credentials: true } } },
    });
    res.status(201).json({ ok: true, data: serializeOrganization(created) });
  }),
);

organizationsRouter.patch(
  "/organizations/:id",
  validateParams(idParam),
  validateBody(updateOrganizationBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const existing = await prisma.organization.findFirst({
      where: { id: req.params.id, userId },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Organization not found");
    const { name, website, description } = req.body as {
      name?: string;
      website?: string | null;
      description?: string;
    };
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(website !== undefined ? { website } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      include: { _count: { select: { credentials: true } } },
    });
    res.json({ ok: true, data: serializeOrganization(updated) });
  }),
);

organizationsRouter.delete(
  "/organizations/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    // Linked credentials keep their history: organizationId is SetNull.
    const result = await prisma.organization.deleteMany({ where: { id: req.params.id, userId } });
    if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Organization not found");
    res.json({ ok: true });
  }),
);
