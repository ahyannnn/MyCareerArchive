"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  credentialsApi,
  organizationsApi,
  skillsApi,
  tagsApi,
  type NamedRef,
  type OrganizationRef,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialForm, EMPTY_FORM, type CredentialFormValue } from "@/components/credential-form";
import { useInvalidateVault } from "@/lib/queries";

function toCreatePayload(v: CredentialFormValue) {
  return {
    title: v.title.trim(),
    description: v.description.trim() || undefined,
    type: v.type,
    organizationId: v.organizationId,
    date: v.date ? new Date(`${v.date}T00:00:00`).toISOString() : undefined,
    location: v.location.trim() || undefined,
    url: v.url.trim() || undefined,
    skillIds: v.skillIds,
    tagIds: v.tagIds,
  };
}

export default function NewCredentialPage() {
  const router = useRouter();
  const invalidateVault = useInvalidateVault();
  const [skills, setSkills] = useState<NamedRef[]>([]);
  const [tags, setTags] = useState<NamedRef[]>([]);
  const [orgs, setOrgs] = useState<OrganizationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([skillsApi.list(), tagsApi.list(), organizationsApi.list()])
      .then(([s, t, o]) => {
        setSkills(s);
        setTags(t);
        setOrgs(o);
      })
      .catch(() => setError("Could not load form options"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(v: CredentialFormValue) {
    setPending(true);
    setError(null);
    try {
      const created = await credentialsApi.create(toCreatePayload(v));
      invalidateVault();
      toast.success("Credential created");
      router.push(`/credentials/${created.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create credential");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        <Link href="/credentials" className="hover:underline">
          Vault
        </Link>{" "}
        / New
      </p>
      <h1 className="mt-1 text-3xl font-bold">New credential</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Capture what just happened. You can attach evidence files next.
      </p>
      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          <CredentialForm
            initial={EMPTY_FORM}
            skills={skills}
            tags={tags}
            orgs={orgs}
            pending={pending}
            error={error}
            submitLabel="Create credential"
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
