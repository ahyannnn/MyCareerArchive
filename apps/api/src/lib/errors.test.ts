import { describe, expect, it } from "vitest";
import { AppError } from "./errors.js";

describe("AppError", () => {
  it("carries status, code, message, and details", () => {
    const details = { field: "title" };
    const err = new AppError(400, "VALIDATION_ERROR", "Title is required", details);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Title is required");
    expect(err.details).toBe(details);
  });

  it("defaults the message to the machine-readable code", () => {
    const err = new AppError(404, "NOT_FOUND");
    expect(err.message).toBe("NOT_FOUND");
    expect(err.details).toBeUndefined();
  });

  it("behaves as an Error", () => {
    const err = new AppError(503, "STORAGE_UNCONFIGURED");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("AppError");
  });
});
