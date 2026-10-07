import { z } from "zod";

export const idParam = z.object({ id: z.string().cuid("Invalid id format") });

// Shared list-query shape: pagination + search + filters + sort.
// Used by GET /api/credentials. Skill/tag/org scoping lives in their routers.
export const credentialQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  type: z
    .enum([
      "PROJECT",
      "CERTIFICATE",
      "SEMINAR",
      "TRAINING",
      "AWARD",
      "COMPETITION",
      "INTERNSHIP",
      "ORGANIZATION",
      "VOLUNTEER",
      "OTHER",
    ])
    .optional(),
  skill: z.string().trim().min(1).max(100).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  organizationId: z.string().cuid().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  sort: z.enum(["date-desc", "date-asc", "created-desc", "created-asc"]).default("date-desc"),
});

export type CredentialQuery = z.infer<typeof credentialQuery>;
