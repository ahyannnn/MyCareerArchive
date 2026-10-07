import { z } from "zod";

// Skill names are unique per user (see schema @@unique([userId, name])).
// Comparison is case-sensitive at the DB level; clients should normalize.
export const skillBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type SkillBody = z.infer<typeof skillBody>;
