"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  credentialsApi,
  organizationsApi,
  skillsApi,
  tagsApi,
  type CredentialSummary,
  type NamedRef,
  type OrganizationRef,
} from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CredentialForm,
  formValueFrom,
  type CredentialFormValue,
} from "@/components/credential-form";

function toUpdatePayload(v: CredentialFormValue) {
  return {
    title: v.title.trim(),
    description: v.description.trim() ? v.description.trim() : null,
    type: v.type,
    organizationId: v.organizationId,
    date: v.date ? new Date(`${v.date}T00:00:00`).toISOString() : null,
    location: v.location.trim() ? v.location.trim() : null,
    url: v.url.trim() ? v.url.trim() : null,
    // Replace semantics: always send the current selection (cleared = empty).
    skillIds: v.skillIds,
    tagIds: v.tagIds,
  };
}

export default function EditCredentialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [original, setOriginal] = useState<CredentialSummary | null>(null);
  const [skills, setSkills] = useState<NamedRef[]>([]);
  const [tags, setTags] = useState<NamedRef[]>([]);
  const [orgs, setOrgs] = useState<OrganizationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      credentialsApi.get(id),
      skillsApi.list(),
      tagsApi.list(),
      organizationsApi.list(),
    ])
      .then(([c, s, t, o]) => {
        setOriginal(c);
        setSkills(s);
        setTags(t);
        setOrgs(o);
      })
      .catch((e: Error & { status?: number }) => {
        if (e instanceof Error && "status" in e && (e as { status: number }).status === 404) {
          setNotFound(true);
        } else {
          setError(e.message ?? "Could not load credential");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(v: CredentialFormValue) {
    if (!original) return;
    setPending(true);
    setError(null);
    try {
      await credentialsApi.update(id, toUpdatePayload(v));
      toast.success("Credential updated");
      router.push(`/credentials/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update credential");
      setPending(false);
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        <Link href="/credentials" className="hover:underline">
          Vault
        </Link>{" "}
        / Edit
      </p>
      <h1 className="mt-1 text-3xl font-bold">Edit credential</h1>
      <div className="mt-6">
        {loading || !original ? (
          <div className="space-y-3">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          <CredentialForm
            key={original.id}
            initial={formValueFrom(original)}
            skills={skills}
            tags={tags}
            orgs={orgs}
            pending={pending}
            error={error}
            submitLabel="Save changes"
            onSkillsChange={setSkills}
            onTagsChange={setTags}
            onOrgsChange={setOrgs}
            onSubmit={submit}
          />
        )}
      </div>
    </main>
  );
}
