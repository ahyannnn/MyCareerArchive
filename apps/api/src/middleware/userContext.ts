import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// TODO(Phase 4 — Authentication): replace this dev stand-in with a real
// session/token middleware that sets req.userId from verified credentials.
// Until then every protected route requires an `x-user-id` header carrying
// an existing User id. The header is validated against the DB (unknown ids
// get 401), and ALL data access below is scoped to req.userId, so the
// ownership model in docs/CONTEXT.md §11 already holds end to end.
export async function userContext(req: Request, _res: Response, next: NextFunction) {
  try {
    const raw = req.header("x-user-id");
    if (!raw || typeof raw !== "string") {
      throw new AppError(401, "UNAUTHENTICATED", "Missing x-user-id header (dev stand-in for Phase 4 auth)");
    }
    const user = await prisma.user.findUnique({ where: { id: raw }, select: { id: true } });
    if (!user) {
      throw new AppError(401, "UNAUTHENTICATED", "Unknown user id");
    }
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireUserId(req: Request): string {
  if (!req.userId) throw new AppError(401, "UNAUTHENTICATED");
  return req.userId;
}
