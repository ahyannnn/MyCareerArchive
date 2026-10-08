import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { cached } from "../lib/cache.js";
import { scoreJobs, searchJobs } from "../lib/jobs.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { validateBody } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { jobsSearchBody, type JobsSearchBody } from "../validation/jobs.js";

export const jobsRouter = Router();

// Per-user TTL for the qualifications aggregate (user-scoped key, same
// staleness contract as the career profile cache).
const QUALIFICATIONS_TTL_MS = 60_000;

// Qualification profile derived from the user's own vault: top skills by
// usage, years active, strongest credential types, and suggested role
// keywords. This is the "what am I qualified for" input to job search.
jobsRouter.get(
  "/career/qualifications",
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);

    const data = await cached(`qualifications:${userId}`, QUALIFICATIONS_TTL_MS, async () => {
      const [skills, range, byType, total] = await Promise.all([
        prisma.skill.findMany({
          where: { userId },
          include: { _count: { select: { credentials: true } } },
          orderBy: { credentials: { _count: "desc" } },
          take: 10,
        }),
        prisma.credential.aggregate({
          where: { userId, date: { not: null } },
          _min: { date: true },
          _max: { date: true },
        }),
        prisma.credential.groupBy({ by: ["type"], where: { userId }, _count: { _all: true } }),
        prisma.credential.count({ where: { userId } }),
      ]);

      const topSkills = skills.map((s) => ({
        id: s.id,
        name: s.name,
        credentialCount: s._count.credentials,
      }));
      const [a, b] = topSkills.map((s) => s.name);
      const suggestedQueries = [...new Set([a ? `${a} developer` : null, a && b ? `${a} ${b}` : null, a])].filter(
        (q): q is string => Boolean(q),
      );

      return {
        topSkills,
        totalCredentials: total,
        yearsActive:
          range._min.date && range._max.date
            ? { start: range._min.date, end: range._max.date }
            : null,
        byType: Object.fromEntries(byType.map((g) => [g.type, g._count._all])),
        suggestedQueries,
      };
    });

    res.json({ ok: true, data });
  }),
);

jobsRouter.post(
  "/jobs/search",
  validateBody(jobsSearchBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const body = req.body as JobsSearchBody;
    const location = body.location?.trim() || (body.scope === "local" ? "Philippines" : "Worldwide");

    // Default skill set = user's most-used skills (evidence-backed matching).
    let skillNames: string[];
    if (body.skills && body.skills.length > 0) {
      skillNames = [...new Set(body.skills.map((s) => s.trim()))].filter(Boolean).slice(0, 50);
    } else {
      const top = await prisma.skill.findMany({
        where: { userId },
        include: { _count: { select: { credentials: true } } },
        orderBy: { credentials: { _count: "desc" } },
        take: 10,
      });
      skillNames = top.map((s) => s.name);
    }

    const query = body.query?.trim() || skillNames[0] || null;
    if (!query) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Provide a query or add skills to your credentials first",
      );
    }

    const { listings, cached } = await searchJobs(body.scope, query, location);
    const scored = scoreJobs(listings, skillNames).slice(0, body.limit);

    res.json({
      ok: true,
      data: {
        jobs: scored,
        cached,
        scope: body.scope,
        query,
        location,
        totalSkills: skillNames.length,
      },
    });
  }),
);
