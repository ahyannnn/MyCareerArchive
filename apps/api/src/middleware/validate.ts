import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

// Validates req.body / req.params / req.query against a Zod schema.
// On success the *parsed* (coerced, defaulted, stripped) value replaces the
// original. On failure the ZodError flows to the central error handler,
// which renders 400 VALIDATION_ERROR.
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.params = parsed.data as typeof req.params;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    // Attach parsed query separately — Express 4's req.query setter is
    // unreliable, so handlers read (req as ValidatedRequest).query.
    (req as ValidatedRequest).parsedQuery = parsed.data;
    next();
  };
}

export interface ValidatedRequest<T = unknown> extends Express.Request {
  parsedQuery?: T;
}

// Read the validated+coerced query inside a handler. Throws 500 if the route
// forgot validateQuery — a server bug, never a client error.
export function getQuery<T>(req: Express.Request): T {
  const q = (req as ValidatedRequest<T>).parsedQuery;
  if (q === undefined) throw new Error("Validated query missing: route must use validateQuery first");
  return q;
}
