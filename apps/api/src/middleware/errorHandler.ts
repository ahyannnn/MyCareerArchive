import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

// Central error handler. Every failure leaves here with the envelope:
//   { ok: false, error: CODE, message?, details? }
// so clients only ever branch on stable `error` codes, never messages.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: err.code,
      ...(err.message !== err.code ? { message: err.message } : {}),
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: "VALIDATION_ERROR",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Target record missing (e.g. stale nested connect).
    if (err.code === "P2025") {
      res.status(404).json({ ok: false, error: "NOT_FOUND" });
      return;
    }
    // Unique-constraint violation (e.g. duplicate skill/tag name per user).
    if (err.code === "P2002") {
      res.status(409).json({ ok: false, error: "CONFLICT", message: "Resource already exists" });
      return;
    }
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: "NOT_FOUND" });
}
