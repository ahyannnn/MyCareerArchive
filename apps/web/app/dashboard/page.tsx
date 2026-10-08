import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Plus } from "lucide-react";
import { apiFetch, getSessionUser } from "@/lib/server-session";
import type { CredentialList } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialCard } from "@/components/credential-card";

async function count(type?: string): Promise<number> {
  const list = await apiFetch<CredentialList>(
    `/api/credentials?pageSize=1${type ? `&type=${type}` : ""}`,
  );
  return list?.meta.total ?? 0;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [total, projects, certificates, seminars, recent] = await Promise.all([
    count(),
    count("PROJECT"),
    count("CERTIFICATE"),
    count("SEMINAR"),
    apiFetch<CredentialList>("/api/credentials?pageSize=6&sort=created-desc"),
  ]);

  const stats = [
    { label: "Total credentials", value: total },
    { label: "Projects", value: projects },
    { label: "Certificates", value: certificates },
    { label: "Seminars", value: seminars },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold">Welcome, {user.name ?? user.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0
              ? "Your vault is empty. Preserve your first accomplishment today."
              : `${total} credential${total === 1 ? "" : "s"} in your vault.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/credentials">Browse vault</Link>
          </Button>
          <Button asChild>
            <Link href="/credentials/new">
              <Plus />
              Quick Add
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent credentials</h2>
        {total > 6 && (
          <Button variant="link" asChild>
            <Link href="/credentials">View all</Link>
          </Button>
        )}
      </div>

      {(recent?.data.length ?? 0) > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recent!.data.map((c) => (
            <CredentialCard key={c.id} credential={c} />
          ))}
        </div>
      ) : (
        <Card className="mt-4">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <Archive className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">Your vault is empty</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Capture what you just accomplished, like a project, certificate, or seminar, so your
              future self doesn&apos;t have to reconstruct it.
            </p>
            <Button className="mt-6 w-full sm:w-auto" asChild>
              <Link href="/credentials/new">
                <Plus />
                Create your first credential
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
