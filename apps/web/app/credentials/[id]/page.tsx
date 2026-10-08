"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, ClipboardCopy, ExternalLink, ListChecks, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { credentialsApi, generateApi, type CredentialSummary, type ResumeBullets } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialTypeBadge } from "@/components/credential-card";
import { EvidenceSection } from "@/components/evidence-section";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function CredentialDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [credential, setCredential] = useState<CredentialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bullets, setBullets] = useState<ResumeBullets | null>(null);
  const [bulletsBusy, setBulletsBusy] = useState(false);

  useEffect(() => {
    credentialsApi
      .get(id)
      .then(setCredential)
      .catch((e: Error & { status?: number }) => {
        if ("status" in e && (e as { status: number }).status === 404) setNotFound(true);
        else toast.error(e.message ?? "Could not load credential");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function remove() {    setDeleteBusy(true);
    try {
      await credentialsApi.remove(id);
      toast.success("Credential deleted");
      router.push("/credentials");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete credential");
      setDeleteBusy(false);
    }
  }

  async function generateBullets() {
    setBulletsBusy(true);
    try {
      const [entry] = await generateApi.bullets([id]);
      setBullets(entry ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate bullets");
    } finally {
      setBulletsBusy(false);
    }
  }

  async function copyBullets() {
    if (!bullets) return;
    try {
      await navigator.clipboard.writeText(bullets.lines.map((l) => `• ${l}`).join("\n"));
      toast.success("Bullets copied to clipboard");
    } catch {
      toast.error("Could not copy. Select the bullets manually.");
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Credential not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted, or you don&apos;t have access to it.
        </p>
        <Link href="/credentials" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Back to vault
        </Link>
      </main>
    );
  }

  if (loading || !credential) {
    return (
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-8 sm:px-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </main>
    );
  }

  const year = credential.date ? new Date(credential.date).getFullYear() : null;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        <Link href="/credentials" className="hover:underline">
          Vault
        </Link>{" "}
        / {credential.type.charAt(0) + credential.type.slice(1).toLowerCase()}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{credential.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <CredentialTypeBadge type={credential.type} />
            {year && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {new Date(credential.date as string).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {credential.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {credential.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/credentials/${credential.id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      {credential.description && (
        <Section title="Description">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{credential.description}</p>
        </Section>
      )}

      {(credential.skills.length > 0 || credential.tags.length > 0) && (
        <Section title="Skills & tags">
          <div className="space-y-2">
            {credential.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {credential.skills.map((s) => (
                  <Badge key={s.id} variant="secondary">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
            {credential.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {credential.tags.map((t) => (
                  <Badge key={t.id} variant="outline">
                    #{t.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Evidence">
        <EvidenceSection credentialId={credential.id} />
      </Section>

      <Section title="Resume bullets">
        {bullets ? (
          <div className="space-y-3">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {bullets.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyBullets}>
                <ClipboardCopy />
                Copy bullets
              </Button>
              <Button variant="ghost" size="sm" onClick={generateBullets} disabled={bulletsBusy}>
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Built from your stored record. Nothing is invented.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Turn this experience into copy-ready resume bullets.
            </p>
            <Button variant="outline" size="sm" onClick={generateBullets} disabled={bulletsBusy}>
              <ListChecks />
              {bulletsBusy ? "Generating…" : "Generate bullets"}
            </Button>
          </div>
        )}
      </Section>

      {(credential.url || credential.organization) && (
        <Section title="Links & organization">
          <div className="space-y-2 text-sm">
            {credential.url && (
              <p>
                <a
                  href={credential.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
                >
                  <ExternalLink className="size-4" />
                  {credential.url}
                </a>
              </p>
            )}
            {credential.organization && (
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <Building2 className="size-4" />
                {credential.organization.name}
                {credential.organization.website && (
                  <>
                    {" · "}
                    <a
                      href={credential.organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {credential.organization.website}
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </Section>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete credential?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{credential.title}</span> and all of its
              evidence files will be permanently removed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleteBusy} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteBusy} onClick={remove}>
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
