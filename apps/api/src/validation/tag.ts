import { z } from "zod";

export const tagBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type TagBody = z.infer<typeof tagBody>;
