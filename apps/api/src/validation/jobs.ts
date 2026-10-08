import { z } from "zod";

// POST /api/jobs/search — deterministic (non-AI) job matching over external
// listing providers. `local` = Philippines onsite/remote/hybrid (JSearch,
// global Google-for-Jobs aggregate); `international` = worldwide remote-only
// (Remotive public API). Scoring is plain keyword overlap against the user's
// own skill names — same philosophy as the resume builder.
export const jobsSearchBody = z.object({
  scope: z.enum(["local", "international"]),
  // Free-text role/title. Defaults to the user's top skill when omitted.
  query: z.string().trim().max(200).optional(),
  // Only meaningful for `local`. Defaults to the Philippines.
  location: z.string().trim().min(1).max(100).optional(),
  // Explicit skill set to match against. Defaults to the user's top skills.
  skills: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type JobsSearchBody = z.infer<typeof jobsSearchBody>;
