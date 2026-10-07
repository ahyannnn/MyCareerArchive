import { CredentialType } from "@prisma/client";
import { z } from "zod";

// Full credential payload. PATCH uses .partial() (all fields optional);
// skillIds/tagIds use *replace* semantics when present, untouched when omitted.
export const credentialBody = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(10000).optional(),
  type: z.nativeEnum(CredentialType).default("OTHER"),
  organizationId: z.string().cuid().nullable().optional(),
  // ISO-8601 date string; converted to Date in the route handler.
  date: z.string().datetime({ offset: true }).nullable().optional(),
  location: z.string().trim().max(200).optional(),
  url: z.string().trim().url("Must be a valid URL").max(2048).nullable().optional(),
  skillIds: z.array(z.string().cuid()).max(100).optional(),
  tagIds: z.array(z.string().cuid()).max(100).optional(),
});

export const createCredentialBody = credentialBody;
export const updateCredentialBody = credentialBody.partial();

export type CreateCredentialBody = z.infer<typeof createCredentialBody>;
export type UpdateCredentialBody = z.infer<typeof updateCredentialBody>;
