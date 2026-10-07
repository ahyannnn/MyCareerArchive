import { AuthStatus } from "./auth-status";

async function getApiHealth(): Promise<{ ok: boolean; service?: string } | { error: string }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    if (!res.ok) return { error: `API responded with ${res.status}` };
    return (await res.json()) as { ok: boolean; service?: string };
  } catch {
    return { error: "API unreachable — start it with `npm run dev:api`" };
  }
}

export default async function Home() {
  const health = await getApiHealth();
  const apiUp = "ok" in health && health.ok === true;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Phase 4 — Authentication</p>
      <h1 className="mt-2 text-4xl font-bold">MyCareerArchive</h1>
      <p className="mt-4 text-zinc-600">
        MyCareerArchive. Register with email or sign in with Google/GitHub —
        every credential and its evidence stays scoped to your account.
      </p>

      <div className="mt-6">
        <AuthStatus />
      </div>

      <div
        className={`mt-8 rounded-lg border p-4 ${
          apiUp ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="font-semibold">{apiUp ? "API: connected" : "API: not connected"}</p>
        <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(health, null, 2)}</pre>
      </div>

      <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>
          Start the API: <code className="rounded bg-zinc-200 px-1">npm run dev:api</code>
        </li>
        <li>
          Set <code className="rounded bg-zinc-200 px-1">DATABASE_URL</code> in <code className="rounded bg-zinc-200 px-1">.env</code>,
          then run <code className="rounded bg-zinc-200 px-1">npx prisma migrate dev</code>
        </li>
        <li>
          Check <code className="rounded bg-zinc-200 px-1">/api/health/db</code> for the DB connection status
        </li>
      </ol>
    </main>
  );
}
