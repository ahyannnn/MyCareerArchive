import { redirect } from "next/navigation";
import { apiFetch, getSessionUser } from "@/lib/server-session";

interface CredentialSummary {
  id: string;
  title: string;
  type: string;
  date: string | null;
}

interface CredentialList {
  ok: boolean;
  data: CredentialSummary[];
  meta: { total: number };
}

// First authenticated page: proves the full cookie chain
// browser → Next.js → Express → Postgres. Full credential UI lands in Phase 6.
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const list = await apiFetch<CredentialList>("/api/credentials?pageSize=10&sort=created-desc");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Dashboard</p>
      <h1 className="mt-2 text-3xl font-bold">Welcome, {user.name ?? user.email}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {list ? `${list.meta.total} credential${list.meta.total === 1 ? "" : "s"} in your vault.` : "Could not reach the API."}
      </p>

      <ul className="mt-8 space-y-3">
        {(list?.data ?? []).map((c) => (
          <li key={c.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="font-semibold">{c.title}</p>
            <p className="text-xs text-zinc-500">
              {c.type}
              {c.date ? ` · ${new Date(c.date).getFullYear()}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {list?.data.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          Your vault is empty. Credential management UI arrives in Phase 6 — for now the API is fully usable.
        </p>
      )}
    </main>
  );
}
