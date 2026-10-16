import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  corsOrigin,
  exactOrigins,
  globToRegExp,
  isAllowedOrigin,
  originPatterns,
  trustedOrigins,
} from "./cors.js";

const ENV_KEYS = ["WEB_ORIGIN", "WEB_ORIGIN_PATTERNS"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  delete process.env.WEB_ORIGIN;
  delete process.env.WEB_ORIGIN_PATTERNS;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("exactOrigins / originPatterns", () => {
  it("defaults to localhost and parses comma lists", () => {
    expect(exactOrigins()).toEqual(["http://localhost:3000"]);
    expect(originPatterns()).toEqual([]);
    process.env.WEB_ORIGIN = "https://a.example, https://b.example ";
    process.env.WEB_ORIGIN_PATTERNS = "https://*.example.com";
    expect(exactOrigins()).toEqual(["https://a.example", "https://b.example"]);
    expect(originPatterns()).toEqual(["https://*.example.com"]);
  });
});

describe("globToRegExp", () => {
  it("mirrors better-auth wildcard semantics", () => {
    const re = globToRegExp("https://mycareerarchive-*.vercel.app");
    expect(re.test("https://mycareerarchive-tdg9.vercel.app")).toBe(true);
    expect(re.test("https://mycareerarchive-git-x-team.vercel.app")).toBe(true);
    expect(re.test("https://mycareerarchive.vercel.app")).toBe(false);
    expect(re.test("https://mycareerarchive-tdg9.vercel.app.evil.com")).toBe(false);
    expect(re.test("https://evil-mycareerarchive-tdg9.vercel.app")).toBe(false);
    expect(globToRegExp("https://example.com").test("https://example.com.evil.com")).toBe(false);
    expect(globToRegExp("https://?.example.com").test("https://a.example.com")).toBe(true);
    expect(globToRegExp("https://?.example.com").test("https://ab.example.com")).toBe(false);
  });
});

describe("isAllowedOrigin", () => {
  it("allows origin-less callers and exact matches", () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
  });

  it("matches configured glob patterns", () => {
    process.env.WEB_ORIGIN = "https://mycareerarchive-tdg9.vercel.app";
    process.env.WEB_ORIGIN_PATTERNS = "https://mycareerarchive-*.vercel.app";
    expect(isAllowedOrigin("https://mycareerarchive-tdg9.vercel.app")).toBe(true);
    expect(isAllowedOrigin("https://mycareerarchive-abc123-team.vercel.app")).toBe(true);
    expect(isAllowedOrigin("https://other.vercel.app")).toBe(false);
  });

  it("survives invalid patterns without allowing", () => {
    process.env.WEB_ORIGIN_PATTERNS = "([invalid";
    expect(isAllowedOrigin("https://x.vercel.app")).toBe(false);
  });
});

describe("corsOrigin / trustedOrigins", () => {
  it("answers the cors callback with the verdict", () => {
    const calls: unknown[][] = [];
    corsOrigin("https://evil.com", (...args: unknown[]) => {
      calls.push(args);
    });
    expect(calls[0]).toEqual([null, false]);
  });

  it("feeds better-auth exact entries plus raw patterns", () => {
    process.env.WEB_ORIGIN = "https://a.example";
    process.env.WEB_ORIGIN_PATTERNS = "https://*.example.com";
    expect(trustedOrigins()).toEqual(["https://a.example", "https://*.example.com"]);
  });
});
