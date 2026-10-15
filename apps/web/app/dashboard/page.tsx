import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Plus, ChartBar, Shield, Folder, Clock } from "lucide-react";
import { apiFetch, getSessionUser } from "@/lib/server-session";
import type { CareerProfile, CredentialList } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialCard } from "@/components/credential-card";
import { DashboardToast } from "@/components/dashboard-toast";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Two round trips total (was six: session + 4 counts + recent). Counts come
  // from the career profile aggregate instead of four ?pageSize=1 queries.
  // NOTE: apiFetch returns the full { ok, data } envelope (unlike the
  // client api-client which unwraps body.data), so read through .data.
  const [profile, recent] = await Promise.all([
    apiFetch<{ data: CareerProfile }>("/api/career/profile"),
    apiFetch<CredentialList>("/api/credentials?pageSize=6&sort=created-desc"),
  ]);

  const totals = profile?.data?.totals;
  const total = totals?.credentials ?? 0;
  const stats = [
    { label: "Total credentials", value: total },
    { label: "Projects", value: totals?.byType.PROJECT ?? 0 },
    { label: "Certificates", value: totals?.byType.CERTIFICATE ?? 0 },
    { label: "Seminars", value: totals?.byType.SEMINAR ?? 0 },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DashboardToast />
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome, ${user.name ?? user.email}`}
        description={
          total === 0
            ? "Your vault is empty. Preserve your first accomplishment today."
            : `${total} credential${total === 1 ? "" : "s"} in your vault.`
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/credentials">Browse vault</Link>
            </Button>
            <Button asChild>
              <Link href="/credentials/new">
                <Plus />
                Quick Add
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      "Total credentials": Shield,
      Projects: Folder,
      Certificates: Archive,
      Seminars: ChartBar,
    };
    const Icon = iconMap[s.label] ?? Folder;
    return (
      <Card
        key={s.label}
        className="group hover:shadow-md group-hover:-translate-y-0.5 animate-fade-in-up"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <CardHeader className="pb-2">
          <Icon className="size-4 mb-2 block" />
          <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Icon className="size-4" />
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        </CardContent>
      </Card>
    );
  })}
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
          <EmptyState
            icon={Archive}
            title="Your vault is empty"
            description="Capture what you just accomplished, like a project, certificate, or seminar, so your future self doesn't have to reconstruct it."
            action={
              <Button asChild>
                <Link href="/credentials/new">
                  <Plus />
                  Create your first credential
                </Link>
              </Button>
            }
          />
        </Card>
      )}
    </main>
  );
}
