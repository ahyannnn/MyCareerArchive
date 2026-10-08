import { headers } from "next/headers";
import { cache } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

// Server-side session lookup: forwards the browser's cookies to Express,
// which validates the session against Postgres. Returns null when signed out.
// Wrapped in React cache() so the header and the page share ONE get-session
// round trip per request instead of each paying for it.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = headers().get("cookie") ?? "";
  if (!cookie) return null;
  try {
    const res = await fetch(`${API}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: SessionUser } | null;
    return data?.user ?? null;
  } catch {
    return null;
  }
});

// Authenticated API fetch from server components: same cookie forwarding,
// so Express sees the session and scopes data to the user.
export async function apiFetch<T>(path: string): Promise<T | null> {
  const cookie = headers().get("cookie") ?? "";
  try {
    const res = await fetch(`${API}${path}`, { headers: { cookie }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
