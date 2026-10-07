import Link from "next/link";
import { Building2, CalendarDays, FileStack } from "lucide-react";
import type { CredentialSummary, CredentialType } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TYPE_BADGE: Record<CredentialType, string> = {
  PROJECT: "bg-blue-600",
  CERTIFICATE: "bg-emerald-600",
  SEMINAR: "bg-violet-600",
  TRAINING: "bg-cyan-600",
  AWARD: "bg-amber-500",
  COMPETITION: "bg-orange-600",
  INTERNSHIP: "bg-teal-600",
  ORGANIZATION: "bg-slate-600",
  VOLUNTEER: "bg-pink-600",
  OTHER: "bg-zinc-500",
};

export function CredentialTypeBadge({ type }: { type: CredentialType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-white",
        TYPE_BADGE[type] ?? TYPE_BADGE.OTHER,
      )}
    >
      {type}
    </span>
  );
}

export function CredentialCard({ credential }: { credential: CredentialSummary }) {
  const year = credential.date ? new Date(credential.date).getFullYear() : null;
  return (
    <Link href={`/credentials/${credential.id}`} className="block">
      <Card className="transition-colors hover:border-primary/40 hover:shadow-md">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug">{credential.title}</p>
            <CredentialTypeBadge type={credential.type} />
          </div>
          {credential.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{credential.description}</p>
          )}
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
          {credential.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {credential.skills.slice(0, 5).map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.name}
                </Badge>
              ))}
              {credential.skills.length > 5 && (
                <Badge variant="outline">+{credential.skills.length - 5}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
