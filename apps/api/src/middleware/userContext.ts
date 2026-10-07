import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { AppError } from "../lib/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Session auth (Phase 4): resolves the caller from the Better Auth session
// cookie and scopes every downstream query to that user, so the ownership
// model in docs/CONTEXT.md §11 holds end to end. No session (or an
// expired/revoked one) → 401, never a data leak.
export async function userContext(req: Request, _res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Not signed in");
    }
    req.userId = session.user.id;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireUserId(req: Request): string {
  if (!req.userId) throw new AppError(401, "UNAUTHENTICATED");
  return req.userId;
}
