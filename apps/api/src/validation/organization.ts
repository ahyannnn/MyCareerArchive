import { z } from "zod";

export const organizationBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  website: z.string().trim().url("Must be a valid URL").max(2048).nullable().optional(),
  description: z.string().trim().max(5000).optional(),
});

export const updateOrganizationBody = organizationBody.partial();

export type OrganizationBody = z.infer<typeof organizationBody>;
