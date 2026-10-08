import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, FilePlus2, FileStack, Pencil } from "lucide-react";
import { apiFetch, getSessionUser } from "@/lib/server-session";
import type { CredentialList, EvidenceItem } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";

interface FeedEvent {
  key: string;
  at: string;
  title: string;
  detail: string;
  href: string;
  kind: "created" | "updated" | "evidence";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ActivityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const recent = await apiFetch<CredentialList>(
    "/api/credentials?pageSize=20&sort=updated-desc",
  );
  const credentials = recent?.data ?? [];

  const evidenceLists = await Promise.all(
    credentials.slice(0, 10).map((c) =>
      apiFetch<{ data: EvidenceItem[] }>(`/api/credentials/${c.id}/evidence`),
    ),
  );

  const events: FeedEvent[] = [];
  for (const c of credentials) {
    const href = `/credentials/${c.id}`;
    events.push({
      key: `${c.id}-created`,
      at: c.createdAt,
      title: `Saved ${c.title}`,
      detail: `${c.type} added to your vault`,
      href,
      kind: "created",
    });
    if (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 60_000) {
      events.push({
        key: `${c.id}-updated`,
        at: c.updatedAt,
        title: `Updated ${c.title}`,
        detail: "Credential details changed",
        href,
        kind: "updated",
      });
    }
  }
  evidenceLists.forEach((list, i) => {
    const credential = credentials[i];
    if (!credential || !list) return;
    for (const item of list.data ?? []) {
      events.push({
        key: item.id,
        at: item.createdAt,
        title: `Attached ${item.fileName}`,
        detail: `Evidence for ${credential.title}`,
        href: `/credentials/${credential.id}`,
        kind: "evidence",
      });
    }
  });
  events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const feed = events.slice(0, 30);

  const KIND_ICON = {
    created: FilePlus2,
    updated: Pencil,
    evidence: FileStack,
  } as const;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        My Activity
      </p>
      <h1 className="mt-1 font-display text-3xl tracking-tight">Recent activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        New and updated credentials plus freshly attached evidence.
      </p>

      {feed.length > 0 ? (
        <Card className="mt-6">
          <CardContent className="p-2">
            <ul className="divide-y divide-border">
              {feed.map((event) => {
                const Icon = KIND_ICON[event.kind];
                return (
                  <li key={event.key}>
                    <Link
                      href={event.href}
                      className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-accent"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {event.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {event.detail}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(event.at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="px-6 py-12 text-center">
            <Activity className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-4 text-lg font-semibold">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save your first credential and it will show up here.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
