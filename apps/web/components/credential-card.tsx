"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, FileImage, FileStack } from "lucide-react";
import { evidenceApi, type CredentialSummary, type CredentialType } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TYPE_DOT: Record<CredentialType, string> = {
  PROJECT: "bg-blue-500",
  CERTIFICATE: "bg-emerald-500",
  SEMINAR: "bg-violet-500",
  TRAINING: "bg-cyan-500",
  AWARD: "bg-amber-500",
  COMPETITION: "bg-orange-500",
  INTERNSHIP: "bg-teal-500",
  ORGANIZATION: "bg-slate-500",
  VOLUNTEER: "bg-pink-500",
  OTHER: "bg-zinc-500",
};

export function CredentialTypeBadge({ type }: { type: CredentialType }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", TYPE_DOT[type] ?? TYPE_DOT.OTHER)} />
      {type}
    </span>
  );
}

// Module-level cache for presigned preview URLs (1h TTL server-side, so
// treat entries as stale after 50 min and refetch instead of showing a
// broken-expired image).
const previewUrlCache = new Map<string, { url: string; at: number }>();
const PREVIEW_CACHE_MS = 50 * 60_000;

function PreviewPlaceholder() {
  return (
    <div className="flex aspect-video w-full items-center justify-center border-b bg-muted/60">
      <FileImage className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
    </div>
  );
}

function CardPreviewImage({ evidenceId, title }: { evidenceId: string; title: string }) {
  const cached = previewUrlCache.get(evidenceId);
  const fresh = cached && Date.now() - cached.at < PREVIEW_CACHE_MS ? cached.url : null;
  const [url, setUrl] = useState<string | null>(fresh);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (fresh) return;
    let cancelled = false;
    evidenceApi
      .downloadUrl(evidenceId)
      .then(({ url }) => {
        previewUrlCache.set(evidenceId, { url, at: Date.now() });
        if (!cancelled) setUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [evidenceId, fresh]);

  if (failed) return <PreviewPlaceholder />;
  if (!url) {
    return (
      <div className="aspect-video w-full border-b">
        <Skeleton className="size-full rounded-none" />
      </div>
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden border-b bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
      <span className="sr-only">{title}</span>
    </div>
  );
}

export function CredentialCard({ credential }: { credential: CredentialSummary }) {
  const year = credential.date ? new Date(credential.date).getFullYear() : null;
  return (
    <Link href={`/credentials/${credential.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        {credential.preview ? (
          <CardPreviewImage evidenceId={credential.preview.evidenceId} title={credential.title} />
        ) : (
          <PreviewPlaceholder />
        )}
        <CardContent className="flex flex-1 flex-col space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 min-h-[2.5rem] font-semibold leading-snug">{credential.title}</p>
            <CredentialTypeBadge type={credential.type} />
          </div>
          {credential.description ? (
            <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">{credential.description}</p>
          ) : (
            <p aria-hidden="true" className="min-h-[2.5rem] text-sm" />
          )}
          <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {year && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {year}
              </span>
            )}
            {credential.organization && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" />
                {credential.organization.name}
              </span>
            )}
            {credential.evidenceCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <FileStack className="size-3.5" />
                {credential.evidenceCount} file{credential.evidenceCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {credential.skills.length > 0 ? (
            <div className="flex min-h-[1.75rem] flex-wrap gap-1.5 overflow-hidden">
              {credential.skills.slice(0, 5).map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.name}
                </Badge>
              ))}
              {credential.skills.length > 5 && (
                <Badge variant="outline">+{credential.skills.length - 5}</Badge>
              )}
            </div>
          ) : (
            <p aria-hidden="true" className="min-h-[1.75rem]" />
          )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
