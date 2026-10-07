import { z } from "zod";
import { maxEvidenceBytes } from "../lib/storage.js";

// Broad allowlist (Phase 5 decision): images, PDFs, office docs, plain
// text, and common archives. Single source of truth — the initiate route
// rejects anything not on this list BEFORE touching storage.
export const ALLOWED_MIME_TYPES: readonly string[] = [
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
];

export const initiateEvidenceBody = z.object({
  fileName: z.string().trim().min(1, "fileName is required").max(255),
  mimeType: z.string().trim().refine((m) => (ALLOWED_MIME_TYPES as readonly string[]).includes(m), {
    message: "File type is not allowed",
  }),
  // Client-declared size for upfront validation; the REAL size is verified
  // server-side at complete-time via HeadObject.
  fileSize: z
    .number()
    .int()
    .positive("fileSize must be positive")
    .max(maxEvidenceBytes(), `File exceeds the ${process.env.EVIDENCE_MAX_MB ?? 25} MB limit`),
});

export type InitiateEvidenceBody = z.infer<typeof initiateEvidenceBody>;
