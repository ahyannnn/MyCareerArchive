import type { Request } from "express";

// Shared origin policy for Express CORS and better-auth trustedOrigins.
//
// - WEB_ORIGIN: comma-separated exact origins (e.g. production frontend,
//   local dev). Unchanged behavior.
// - WEB_ORIGIN_PATTERNS: comma-separated glob patterns using better-auth's
//   syntax (`*` = any run of non-`/` chars), e.g.
//   `https://mycareerarchive-*.vercel.app` to cover Vercel preview
//   deployments of this project. The same strings feed better-auth
//   natively; Express matches them via globToRegExp below.
//
// Requests without an Origin header (curl, SSR, tests, health probes) are
// always allowed through — CORS only constrains browsers.
export function exactOrigins(): string[] {
  return (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function originPatterns(): string[] {
  return (process.env.WEB_ORIGIN_PATTERNS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Convert a better-auth glob pattern to an equivalent RegExp so Express
// CORS enforces exactly what better-auth trusts: `*` never crosses `/`,
// `?` matches one non-`/` char, `**` matches anything.
export function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i += 1;
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/, "\\$&");
    }
  }
  return new RegExp(`${out}$`);
}

export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true;
  if (exactOrigins().includes(origin)) return true;
  return originPatterns().some((p) => {
    try {
      return globToRegExp(p).test(origin);
    } catch {
      return false;
    }
  });
}

// Callback form required by the `cors` package.
export function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  callback(null, isAllowedOrigin(origin));
}

// better-auth consumes the raw glob strings natively (wildcard support),
// so both layers trust byte-identical origin sets.
export function trustedOrigins(): string[] {
  return [...exactOrigins(), ...originPatterns()];
}

// For middleware/tests that need the caller's origin.
export function requestOrigin(req: Request): string | undefined {
  const header = req.headers.origin;
  return typeof header === "string" ? header : undefined;
}
