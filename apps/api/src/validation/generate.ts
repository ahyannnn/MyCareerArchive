import { z } from "zod";

// Deterministic content generation (no AI): resume bullets, portfolio
// descriptions, and interview questions assembled verbatim from stored
// credentials via fixed templates. Missing fields are skipped, never
// invented — AI phrasing stays a future Phase 9 concern.
export const credentialIdsBody = z.object({
  credentialIds: z.array(z.string().cuid()).min(1).max(20),
});

export const interviewPrepareBody = z.object({
  credentialIds: z.array(z.string().cuid()).max(20).optional(),
  skill: z.string().trim().min(1).max(100).optional(),
  // Caps total questions (each credential yields up to 4).
  limit: z.number().int().min(1).max(20).default(10),
});

export type CredentialIdsBody = z.infer<typeof credentialIdsBody>;
export type InterviewPrepareBody = z.infer<typeof interviewPrepareBody>;
