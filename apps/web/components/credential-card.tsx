import Link from "next/link";
import { Building2, CalendarDays, FileStack } from "lucide-react";
import type { CredentialSummary, CredentialType } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", TYPE_DOT[type] ?? TYPE_DOT.OTHER)} />
      {type}
    </span>
  );
}

export function CredentialCard({ credential }: { credential: CredentialSummary }) {
  const year = credential.date ? new Date(credential.date).getFullYear() : null;
  return (
    <Link href={`/credentials/${credential.id}`} className="block">
      <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
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
