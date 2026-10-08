// Tiny per-user TTL cache for expensive read aggregates (profile,
// qualifications). Keys MUST always embed the userId — entries are
// user-scoped, so a shared process can never leak one user's aggregates to
// another. Single-process safe; documented multi-instance caveat: each
// instance holds its own copy for up to TTL.
const store = new Map<string, { at: number; value: unknown }>();

export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await compute();
  store.set(key, { at: Date.now(), value });
  return value;
}

export function __resetCacheForTests(): void {
  store.clear();
}
