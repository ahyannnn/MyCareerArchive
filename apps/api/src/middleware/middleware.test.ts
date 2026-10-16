import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { takeTestEmail, testEmailOutbox } from "../auth.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { asyncHandler } from "./asyncHandler.js";
import { errorHandler, notFound } from "./errorHandler.js";
import { requireUserId } from "./userContext.js";
import { getQuery, validateBody, validateParams, validateQuery } from "./validate.js";
import { credentialBody } from "../validation/credential.js";

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as unknown as Response;
}

function knownPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("db error", { code, clientVersion: "test" });
}

describe("errorHandler envelope", () => {
  it("renders AppError with message and details", () => {
    const res = mockRes();
    const next = vi.fn();
    errorHandler(new AppError(422, "WEIRD", "Something odd", { f: 1 }), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: "WEIRD",
      message: "Something odd",
      details: { f: 1 },
    });
  });

  it("omits message when it equals the code, and details when absent", () => {
    const res = mockRes();
    errorHandler(new AppError(404, "NOT_FOUND"), {} as Request, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "NOT_FOUND" });
  });

  it("renders ZodError as 400 VALIDATION_ERROR with paths", () => {
    const parsed = credentialBody.safeParse({ title: "" });
    expect(parsed.success).toBe(false);
    const res = mockRes();
    if (!parsed.success) errorHandler(parsed.error, {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.details[0]).toMatchObject({ path: "title" });
  });

  it("maps P2025 to 404 and P2002 to 409", () => {
    const r1 = mockRes();
    errorHandler(knownPrismaError("P2025"), {} as Request, r1, vi.fn());
    expect(r1.status).toHaveBeenCalledWith(404);
    expect(r1.json).toHaveBeenCalledWith({ ok: false, error: "NOT_FOUND" });

    const r2 = mockRes();
    errorHandler(knownPrismaError("P2002"), {} as Request, r2, vi.fn());
    expect(r2.status).toHaveBeenCalledWith(409);
    expect(r2.json).toHaveBeenCalledWith({
      ok: false,
      error: "CONFLICT",
      message: "Resource already exists",
    });
  });

  it("falls back to 500 INTERNAL_ERROR for anything else", () => {
    const logged = vi.spyOn(logger, "error").mockImplementation(() => {});
    const r1 = mockRes();
    errorHandler(knownPrismaError("P2003"), {} as Request, r1, vi.fn());
    expect(r1.status).toHaveBeenCalledWith(500);
    expect(r1.json).toHaveBeenCalledWith({ ok: false, error: "INTERNAL_ERROR" });

    const r2 = mockRes();
    errorHandler(new Error("kaboom"), {} as Request, r2, vi.fn());
    expect(r2.json).toHaveBeenCalledWith({ ok: false, error: "INTERNAL_ERROR" });
    expect(logged).toHaveBeenCalledTimes(2);
    logged.mockRestore();
  });

  it("notFound answers 404", () => {
    const res = mockRes();
    notFound({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "NOT_FOUND" });
  });
});

describe("validate middleware", () => {
  it("validateBody replaces the body with parsed data and forwards ZodErrors", () => {
    const schema = z.object({ n: z.coerce.number() });
    const okNext = vi.fn();
    const req = { body: { n: "5" } } as unknown as Request;
    validateBody(schema)(req, mockRes(), okNext);
    expect(req.body).toEqual({ n: 5 });
    expect(okNext).toHaveBeenCalledWith();

    const failNext = vi.fn();
    validateBody(schema)({ body: { n: "abc" } } as unknown as Request, mockRes(), failNext);
    expect(failNext.mock.calls[0][0]).toBeInstanceOf(z.ZodError);
  });

  it("validateParams forwards invalid ids", () => {
    const next = vi.fn();
    validateParams(z.object({ id: z.string().cuid() }))(
      { params: { id: "bad" } } as unknown as Request,
      mockRes(),
      next,
    );
    expect(next.mock.calls[0][0]).toBeInstanceOf(z.ZodError);
  });

  it("validateQuery attaches parsedQuery and getQuery reads it", () => {
    const next = vi.fn();
    const req = { query: { page: "2" } } as unknown as Request;
    validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1) }))(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(getQuery<{ page: number }>(req)).toEqual({ page: 2 });
    expect(() => getQuery({} as Request)).toThrow("validateQuery first");
  });
});

describe("user helpers", () => {
  it("requireUserId returns the id or throws 401", () => {
    expect(requireUserId({ userId: "u1" } as Request)).toBe("u1");
    try {
      requireUserId({} as Request);
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 401, code: "UNAUTHENTICATED" });
    }
  });

  it("asyncHandler forwards rejections to next", async () => {
    const err = new Error("async boom");
    const next = vi.fn();
    await new Promise<void>((resolve) => {
      asyncHandler(async () => {
        throw err;
      })({} as Request, mockRes(), (...a: unknown[]) => {
        (next as (...args: unknown[]) => void)(...a);
        resolve();
      });
    });
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("test email outbox", () => {
  it("round-trips a recorded email and throws when empty", () => {
    testEmailOutbox.push({ type: "verification", to: "rt@example.com", url: "u", token: "t" });
    expect(takeTestEmail("rt@example.com", "verification").token).toBe("t");
    expect(() => takeTestEmail("rt@example.com", "verification")).toThrow("No verification email");
  });
});
