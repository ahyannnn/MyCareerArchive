import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetCacheForTests, cached } from "./cache.js";

beforeEach(() => {
  __resetCacheForTests();
  vi.useRealTimers();
});

describe("cached", () => {
  it("computes and returns the value on a miss", async () => {
    const compute = vi.fn(async () => 42);
    await expect(cached("k", 1000, compute)).resolves.toBe(42);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("serves the cached value without recomputing inside the TTL", async () => {
    const compute = vi.fn(async () => "v1");
    await cached("k", 60_000, compute);
    await cached("k", 60_000, compute);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("recomputes after the TTL expires", async () => {
    vi.useFakeTimers();
    const compute = vi.fn(async () => "fresh");
    await cached("k", 1000, compute);
    vi.advanceTimersByTime(1001);
    await cached("k", 1000, compute);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("keeps keys independent", async () => {
    const a = vi.fn(async () => "a");
    const b = vi.fn(async () => "b");
    await cached("a", 60_000, a);
    await cached("b", 60_000, b);
    await cached("a", 60_000, a);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures, so the next call retries", async () => {
    let calls = 0;
    const compute = vi.fn(async (): Promise<string> => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return "ok";
    });
    await expect(cached("k", 60_000, compute)).rejects.toThrow("boom");
    await expect(cached("k", 60_000, compute)).resolves.toBe("ok");
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
