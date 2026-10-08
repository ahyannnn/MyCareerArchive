import { CredentialType } from "@prisma/client";
import { z } from "zod";

const credentialTypeEnum = z.nativeEnum(CredentialType);

// GET /api/timeline — year-grouped credential view. Same filter vocabulary
// as GET /api/credentials (subset), paginated at the credential level and
// grouped server-side so the UI renders year sections directly.
export const timelineQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(200).optional(),
  type: credentialTypeEnum.optional(),
  skill: z.string().trim().min(1).max(100).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  sort: z.enum(["date-desc", "date-asc"]).default("date-desc"),
});

export type TimelineQuery = z.infer<typeof timelineQuery>;

// GET /api/career/skills — per-skill usage history (counts + first/last use
// + the credentials behind them). Deliberately NO proficiency percentage:
// counts and dates are evidence, scores would be invention (CONTEXT §17).
export const skillHistoryQuery = z.object({
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["count", "recent", "name"]).default("count"),
});

export type SkillHistoryQuery = z.infer<typeof skillHistoryQuery>;

// POST /api/resume/build — deterministic (non-AI) resume content assembled
// verbatim from stored credentials. Ranks candidates by keyword overlap with
// the target role; never invents experience (Phase 9 owns AI generation).
export const resumeBuildBody = z.object({
  targetRole: z.string().trim().max(200).optional(),
  skill: z.string().trim().min(1).max(100).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  includeTypes: z.array(credentialTypeEnum).max(10).optional(),
  credentialIds: z.array(z.string().cuid()).max(100).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type ResumeBuildBody = z.infer<typeof resumeBuildBody>;

// POST /api/portfolio/build — deterministic per-entry markdown cards for the
// selected credentials (all types eligible). Same ownership + filter pattern.
export const portfolioBuildBody = z.object({
  credentialIds: z.array(z.string().cuid()).max(100).optional(),
  type: credentialTypeEnum.optional(),
  skill: z.string().trim().min(1).max(100).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type PortfolioBuildBody = z.infer<typeof portfolioBuildBody>;
