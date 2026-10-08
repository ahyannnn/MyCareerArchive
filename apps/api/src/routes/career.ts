import type { Prisma } from "@prisma/client";
import { CredentialType } from "@prisma/client";
import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { credentialInclude, serializeCredential } from "../lib/serialize.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { getQuery, validateBody, validateQuery } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import {
  portfolioBuildBody,
  resumeBuildBody,
  skillHistoryQuery,
  timelineQuery,
  type PortfolioBuildBody,
  type ResumeBuildBody,
  type SkillHistoryQuery,
  type TimelineQuery,
} from "../validation/career.js";

export const careerRouter = Router();

const ALL_TYPES = Object.values(CredentialType);

// Shared credential filter builder — same vocabulary as GET /api/credentials
// (title/description/location/org/skills/tags search, type, skill, tag, year).
function buildCredentialWhere(
  userId: string,
  q: { search?: string; type?: CredentialType; skill?: string; tag?: string; year?: number },
): Prisma.CredentialWhereInput {
  const where: Prisma.CredentialWhereInput = { userId };
  if (q.type) where.type = q.type;
  if (q.year) {
    where.date = { gte: new Date(Date.UTC(q.year, 0, 1)), lt: new Date(Date.UTC(q.year + 1, 0, 1)) };
  }
  if (q.skill) {
    where.skills = { some: { skill: { name: { contains: q.skill, mode: "insensitive" as const } } } };
  }
  if (q.tag) {
    where.tags = { some: { tag: { name: { contains: q.tag, mode: "insensitive" as const } } } };
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
  return where;
}

function timelineYear(date: Date | string | null): number | null {
  if (!date) return null;
  return new Date(date).getUTCFullYear();
}

function formatDay(date: Date | string | null): string | null {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// --- Timeline ---------------------------------------------------------------

careerRouter.get(
  "/timeline",
  validateQuery(timelineQuery),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const q = getQuery<TimelineQuery>(req);
    const where = buildCredentialWhere(userId, q);

    const orderBy: Prisma.CredentialOrderByWithRelationInput[] =
      q.sort === "date-asc"
        ? [{ date: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
        : [{ date: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];

    const [total, rows, allDates] = await prisma.$transaction([
      prisma.credential.count({ where }),
      prisma.credential.findMany({
        where,
        include: credentialInclude,
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      // Distinct-year count across the whole filter (not just this page).
      prisma.credential.findMany({ where, select: { date: true } }),
    ]);

    const serialized = rows.map(serializeCredential);
    const groups = new Map<number | null, typeof serialized>();
    for (const c of serialized) {
      const year = timelineYear(c.date);
      const list = groups.get(year) ?? [];
      list.push(c);
      groups.set(year, list);
    }
    const data = [...groups.entries()]
      .map(([year, credentials]) => ({ year, count: credentials.length, credentials }))
      .sort((a, b) => {
        if (a.year === null) return 1;
        if (b.year === null) return -1;
        return q.sort === "date-asc" ? a.year - b.year : b.year - a.year;
      });
    const totalYears = new Set(allDates.map((d) => timelineYear(d.date))).size;

    res.json({ ok: true, data, meta: { page: q.page, pageSize: q.pageSize, total, totalYears } });
  }),
);

// --- Career profile ----------------------------------------------------------

careerRouter.get(
  "/career/profile",
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);

    const [credentialTotal, evidenceTotal, skillTotal, tagTotal, orgTotal, byType, range, withEvidence, topSkills, topTags] =
      await Promise.all([
        prisma.credential.count({ where: { userId } }),
        prisma.evidence.count({ where: { credential: { userId } } }),
        prisma.skill.count({ where: { userId } }),
        prisma.tag.count({ where: { userId } }),
        prisma.organization.count({ where: { userId } }),
        prisma.credential.groupBy({ by: ["type"], where: { userId }, _count: { _all: true } }),
        prisma.credential.aggregate({
          where: { userId, date: { not: null } },
          _min: { date: true },
          _max: { date: true },
        }),
        prisma.credential.count({ where: { userId, evidence: { some: { status: "UPLOADED" } } } }),
        prisma.skill.findMany({
          where: { userId },
          include: { _count: { select: { credentials: true } } },
          orderBy: { credentials: { _count: "desc" } },
          take: 5,
        }),
        prisma.tag.findMany({
          where: { userId },
          include: { _count: { select: { credentials: true } } },
          orderBy: { credentials: { _count: "desc" } },
          take: 5,
        }),
      ]);

    const byTypeRecord = Object.fromEntries(ALL_TYPES.map((t) => [t, 0])) as Record<CredentialType, number>;
    for (const g of byType) byTypeRecord[g.type] = g._count._all;

    res.json({
      ok: true,
      data: {
        totals: {
          credentials: credentialTotal,
          evidence: evidenceTotal,
          skills: skillTotal,
          tags: tagTotal,
          organizations: orgTotal,
          byType: byTypeRecord,
        },
        dateRange: { earliest: range._min.date, latest: range._max.date },
        topSkills: topSkills.map((s) => ({
          id: s.id,
          name: s.name,
          credentialCount: s._count.credentials,
        })),
        topTags: topTags.map((t) => ({
          id: t.id,
          name: t.name,
          credentialCount: t._count.credentials,
        })),
        evidenceCoverage: {
          withEvidence,
          withoutEvidence: Math.max(0, credentialTotal - withEvidence),
        },
      },
    });
  }),
);

// --- Skill history -----------------------------------------------------------

careerRouter.get(
  "/career/skills",
  validateQuery(skillHistoryQuery),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const q = getQuery<SkillHistoryQuery>(req);

    const rows = await prisma.skill.findMany({
      where: {
        userId,
        ...(q.search ? { name: { contains: q.search, mode: "insensitive" as const } } : {}),
      },
      include: {
        credentials: { include: { credential: { select: { id: true, title: true, date: true, type: true } } } },
        _count: { select: { credentials: true } },
      },
      // Name sorting is exact in the DB; count/recent need computed dates, so
      // they sort in memory below.
      orderBy: q.sort === "name" ? { name: "asc" } : undefined,
    });

    const data = rows.map((s) => {
      const credentials = s.credentials
        .map((j) => ({
          id: j.credential.id,
          title: j.credential.title,
          date: j.credential.date,
          type: j.credential.type,
        }))
        .sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      const times = credentials
        .map((c) => (c.date ? new Date(c.date).getTime() : null))
        .filter((t): t is number => t !== null);
      return {
        id: s.id,
        name: s.name,
        credentialCount: s._count.credentials,
        firstUsed: times.length > 0 ? new Date(Math.min(...times)) : null,
        lastUsed: times.length > 0 ? new Date(Math.max(...times)) : null,
        credentials,
      };
    });

    if (q.sort === "count") {
      data.sort(
        (a, b) =>
          b.credentialCount - a.credentialCount ||
          (b.lastUsed?.getTime() ?? -1) - (a.lastUsed?.getTime() ?? -1) ||
          a.name.localeCompare(b.name),
      );
    } else if (q.sort === "recent") {
      data.sort(
        (a, b) =>
          (b.lastUsed?.getTime() ?? -1) - (a.lastUsed?.getTime() ?? -1) ||
          b.credentialCount - a.credentialCount ||
          a.name.localeCompare(b.name),
      );
    }

    res.json({ ok: true, data });
  }),
);

// --- Resume builder (deterministic, non-AI) -----------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 10);
}

function scoreCredential(
  c: { title: string; description: string | null; location: string | null; organization: { name: string } | null; skills: { name: string }[]; tags: { name: string }[] },
  tokens: string[],
): number {
  const title = c.title.toLowerCase();
  const desc = (c.description ?? "").toLowerCase();
  const org = (c.organization?.name ?? "").toLowerCase();
  const skills = c.skills.map((s) => s.name.toLowerCase());
  const tags = c.tags.map((t) => t.name.toLowerCase());
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 3;
    if (skills.some((s) => s.includes(t))) score += 2;
    if (desc.includes(t)) score += 1;
    if (org.includes(t)) score += 1;
    if (tags.some((g) => g.includes(t))) score += 1;
  }
  return score;
}

function buildResumeMarkdown(
  matched: ReturnType<typeof serializeCredential>[],
  targetRole: string | null,
): string {
  const lines: string[] = [
    `# Resume — ${targetRole ?? "Career highlights"}`,
    "",
    `_Assembled from ${matched.length} stored experience${matched.length === 1 ? "" : "s"} in MyCareerArchive. Only recorded information is shown — nothing is invented._`,
    "",
    "## Experience",
    "",
  ];
  matched.forEach((c, i) => {
    const year = timelineYear(c.date);
    lines.push(`### ${i + 1}. ${c.title} — ${c.type}${year ? ` · ${year}` : ""}`);
    if (c.description) lines.push("", truncate(c.description, 1000));
    lines.push("");
    if (c.organization) lines.push(`- Organization: ${c.organization.name}`);
    if (c.date) lines.push(`- Date: ${formatDay(c.date)}`);
    if (c.location) lines.push(`- Location: ${c.location}`);
    if (c.skills.length > 0) lines.push(`- Skills: ${c.skills.map((s) => s.name).join(", ")}`);
    if (c.url) lines.push(`- Link: ${c.url}`);
    if (c.evidenceCount > 0)
      lines.push(`- Evidence: ${c.evidenceCount} file${c.evidenceCount === 1 ? "" : "s"} on record`);
    lines.push("");
  });

  // Frequency of skills within the selected set — evidence, not a score.
  const freq = new Map<string, number>();
  for (const c of matched) for (const s of c.skills) freq.set(s.name, (freq.get(s.name) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  if (top.length > 0) {
    lines.push("## Skills in this selection", "");
    for (const [name, n] of top)
      lines.push(`- ${name} — used in ${n} of the selected experience${n === 1 ? "" : "s"}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

careerRouter.post(
  "/resume/build",
  validateBody(resumeBuildBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const body = req.body as ResumeBuildBody;
    const targetRole = body.targetRole?.trim() ? body.targetRole.trim() : undefined;
    const tokens = targetRole ? tokenize(targetRole) : [];

    let matched: ReturnType<typeof serializeCredential>[];

    if (body.credentialIds && body.credentialIds.length > 0) {
      const unique = [...new Set(body.credentialIds)];
      const rows = await prisma.credential.findMany({
        where: { id: { in: unique }, userId },
        include: credentialInclude,
      });
      if (rows.length !== unique.length)
        throw new AppError(404, "NOT_FOUND", "One or more credentials not found");
      const order = new Map(unique.map((id, i) => [id, i]));
      matched = rows
        .map(serializeCredential)
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
        .slice(0, body.limit);
    } else {
      const where = buildCredentialWhere(userId, { skill: body.skill, tag: body.tag });
      if (body.includeTypes && body.includeTypes.length > 0) where.type = { in: [...new Set(body.includeTypes)] };
      if (tokens.length > 0) {
        const tokenOr: Prisma.CredentialWhereInput[] = tokens.flatMap((t) => {
          const contains = { contains: t, mode: "insensitive" as const };
          return [
            { title: contains },
            { description: contains },
            { location: contains },
            { organization: { name: contains } },
            { skills: { some: { skill: { name: contains } } } },
            { tags: { some: { tag: { name: contains } } } },
          ] satisfies Prisma.CredentialWhereInput[];
        });
        const prior = where.AND as Prisma.CredentialWhereInput[] | undefined;
        where.AND = [...(prior ?? []), { OR: tokenOr }];
      }
      const candidates = await prisma.credential.findMany({
        where,
        include: credentialInclude,
        orderBy: [{ date: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: 200,
      });
      const serialized = candidates.map(serializeCredential);
      if (tokens.length > 0) {
        serialized.sort((a, b) => {
          const diff = scoreCredential(b, tokens) - scoreCredential(a, tokens);
          if (diff !== 0) return diff;
          const at = a.date ? new Date(a.date).getTime() : -1;
          const bt = b.date ? new Date(b.date).getTime() : -1;
          return bt - at;
        });
      }
      matched = serialized.slice(0, body.limit);
    }

    res.json({
      ok: true,
      data: { matched, markdown: buildResumeMarkdown(matched, targetRole ?? null), targetRole: targetRole ?? null },
    });
  }),
);

// --- Portfolio builder (deterministic, non-AI) --------------------------------

function buildPortfolioEntryMarkdown(
  c: ReturnType<typeof serializeCredential>,
  evidenceNames: string[],
): string {
  const year = timelineYear(c.date);
  const lines = [
    `## ${c.title}`,
    `*${c.type}${year ? ` · ${year}` : ""}${c.organization ? ` · ${c.organization.name}` : ""}*`,
    "",
  ];
  if (c.description) lines.push(truncate(c.description, 2000), "");
  if (c.skills.length > 0) lines.push(`Skills: ${c.skills.map((s) => s.name).join(", ")}`);
  if (c.tags.length > 0) lines.push(`Tags: ${c.tags.map((t) => t.name).join(", ")}`);
  if (c.url) lines.push(`Link: ${c.url}`);
  if (evidenceNames.length > 0) lines.push(`Evidence on file: ${evidenceNames.join(", ")}`);
  if (c.date) lines.push(`Date: ${formatDay(c.date)}`);
  return lines.join("\n").trimEnd() + "\n";
}

careerRouter.post(
  "/portfolio/build",
  validateBody(portfolioBuildBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const body = req.body as PortfolioBuildBody;

    let rows: Awaited<ReturnType<typeof prisma.credential.findMany<{ include: typeof credentialInclude }>>>;
    if (body.credentialIds && body.credentialIds.length > 0) {
      const unique = [...new Set(body.credentialIds)];
      rows = await prisma.credential.findMany({
        where: { id: { in: unique }, userId },
        include: credentialInclude,
      });
      if (rows.length !== unique.length)
        throw new AppError(404, "NOT_FOUND", "One or more credentials not found");
      const order = new Map(unique.map((id, i) => [id, i]));
      rows = [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).slice(0, body.limit);
    } else {
      const where = buildCredentialWhere(userId, {
        search: body.search,
        type: body.type,
        skill: body.skill,
        tag: body.tag,
      });
      rows = await prisma.credential.findMany({
        where,
        include: credentialInclude,
        orderBy: [{ date: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: body.limit,
      });
    }

    const serialized = rows.map(serializeCredential);
    const evidenceRows =
      serialized.length > 0
        ? await prisma.evidence.findMany({
            where: { credentialId: { in: serialized.map((c) => c.id) }, status: "UPLOADED" },
            select: { credentialId: true, fileName: true },
            orderBy: { createdAt: "asc" },
          })
        : [];
    const namesByCredential = new Map<string, string[]>();
    for (const e of evidenceRows) {
      const list = namesByCredential.get(e.credentialId) ?? [];
      list.push(e.fileName);
      namesByCredential.set(e.credentialId, list);
    }

    const entries = serialized.map((c) => ({
      credential: c,
      markdown: buildPortfolioEntryMarkdown(c, namesByCredential.get(c.id) ?? []),
    }));
    const combinedMarkdown =
      `# Portfolio — ${entries.length} selected experience${entries.length === 1 ? "" : "s"}\n\n` +
      `_Assembled from stored credentials in MyCareerArchive. Only recorded information is shown._\n\n` +
      entries.map((e) => e.markdown).join("\n---\n\n");

    res.json({ ok: true, data: { entries, combinedMarkdown } });
  }),
);
