import { randomBytes } from "node:crypto";
import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { serializeEvidence } from "../lib/serialize.js";
import {
  deleteObject,
  DOWNLOAD_URL_TTL_SECONDS,
  evidenceKey,
  headObject,
  maxEvidenceBytes,
  presignDownload,
  presignUpload,
  UPLOAD_URL_TTL_SECONDS,
} from "../lib/storage.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireUserId } from "../middleware/userContext.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { idParam } from "../validation/common.js";
import { initiateEvidenceBody } from "../validation/evidence.js";

export const evidenceRouter = Router();

// Ownership resolves through the credential: evidence has no userId of its
// own, so every operation first proves the credential belongs to the caller.
async function ownedCredential(userId: string, credentialId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
    select: { id: true },
  });
  if (!credential) throw new AppError(404, "NOT_FOUND", "Credential not found");
  return credential;
}

async function ownedEvidence(userId: string, evidenceId: string) {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: { credential: { select: { userId: true } } },
  });
  if (!evidence || evidence.credential.userId !== userId) {
    throw new AppError(404, "NOT_FOUND", "Evidence not found");
  }
  return evidence;
}

function extensionOf(fileName: string): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

// Step 1/2: reserve the row (PENDING) and hand out a ContentType-locked
// upload URL. Bytes go browser -> R2 directly; the API never sees them.
evidenceRouter.post(
  "/credentials/:id/evidence/initiate",
  validateParams(idParam),
  validateBody(initiateEvidenceBody),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    await ownedCredential(userId, req.params.id);
    const { fileName, mimeType, fileSize } = req.body as {
      fileName: string;
      mimeType: string;
      fileSize: number;
    };

    // The row id comes from Prisma's @default(cuid()) (classic 'c'-prefixed
    // cuids, matching the idParam validator). The key embeds a random part
    // instead — unique per upload, single DB write, no extra dependency.
    const key = evidenceKey(userId, randomBytes(8).toString("hex"), fileName);
    const uploadUrl = await presignUpload(key, mimeType);

    const created = await prisma.evidence.create({
      data: {
        credentialId: req.params.id,
        fileName: fileName.trim(),
        fileType: extensionOf(fileName),
        mimeType,
        fileSize, // declared; verified against reality at complete-time
        storageKey: key,
      },
    });
    res.status(201).json({
      ok: true,
      data: {
        evidence: serializeEvidence(created),
        uploadUrl,
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      },
    });
  }),
);

// Step 2/2: confirm bytes actually landed. HeadObject is the source of
// truth — the stored fileSize is the REAL size, never the declared one.
evidenceRouter.post(
  "/evidence/:id/complete",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const evidence = await ownedEvidence(userId, req.params.id);
    if (evidence.status === "UPLOADED") {
      res.json({ ok: true, data: serializeEvidence(evidence) });
      return;
    }

    const head = await headObject(evidence.storageKey);
    if (!head) {
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: { status: "FAILED" },
      });
      throw new AppError(404, "FILE_NOT_UPLOADED", "No file found in storage for this evidence");
    }
    if (head.size > maxEvidenceBytes()) {
      await deleteObject(evidence.storageKey);
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: { status: "FAILED", fileSize: head.size },
      });
      throw new AppError(400, "FILE_TOO_LARGE", "Uploaded file exceeds the size limit");
    }

    const updated = await prisma.evidence.update({
      where: { id: evidence.id },
      data: { status: "UPLOADED", fileSize: head.size },
    });
    res.json({ ok: true, data: serializeEvidence(updated) });
  }),
);

evidenceRouter.get(
  "/credentials/:id/evidence",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    await ownedCredential(userId, req.params.id);
    const rows = await prisma.evidence.findMany({
      where: { credentialId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ ok: true, data: rows.map(serializeEvidence) });
  }),
);

// Time-boxed download URL for the private bucket. PENDING rows have no
// bytes by definition, so they are not downloadable.
evidenceRouter.get(
  "/evidence/:id/url",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const evidence = await ownedEvidence(userId, req.params.id);
    if (evidence.status !== "UPLOADED") {
      throw new AppError(404, "FILE_NOT_UPLOADED", "This evidence has no downloadable file yet");
    }
    const url = await presignDownload(evidence.storageKey);
    res.json({ ok: true, data: { url, expiresIn: DOWNLOAD_URL_TTL_SECONDS } });
  }),
);

evidenceRouter.delete(
  "/evidence/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const evidence = await ownedEvidence(userId, req.params.id);
    // Storage first, then the row: a failed delete aborts before we lose
    // the reference; deleteObject itself is idempotent on missing keys.
    await deleteObject(evidence.storageKey);
    await prisma.evidence.delete({ where: { id: evidence.id } });
    res.json({ ok: true });
  }),
);
