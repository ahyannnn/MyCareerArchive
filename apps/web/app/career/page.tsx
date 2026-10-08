"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { useCareerProfile, useSkillHistory } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialTypeBadge } from "@/components/credential-card";

const SKILL_SORTS = [
  { value: "count", label: "Most used" },
  { value: "recent", label: "Recently used" },
  { value: "name", label: "Name A to Z" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function yearOf(iso: string | null): string {
  if (!iso) return "Unknown";
  return String(new Date(iso).getFullYear());
}

function dayOf(iso: string | null): string {
  if (!iso) return "Undated";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function CareerPage() {
  const [sort, setSort] = useState("count");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Independent queries: re-sorting skills never refires the profile
  // aggregate, and each caches under its own key.
  const { data: profile, isLoading: profileLoading, error: profileError } = useCareerProfile();
  const { data: skills, isLoading: skillsLoading, error: skillsError } = useSkillHistory(
    sort,
    debouncedSearch || undefined,
  );
  const loading = profileLoading && !profile;
  const skillsInitialLoading = skillsLoading && !skills;
  const error = profileError ?? skillsError;

  const stats = profile
    ? [
        { label: "Total experiences", value: profile.totals.credentials },
        { label: "Evidence files", value: profile.totals.evidence },
        { label: "Skills", value: profile.totals.skills },
        { label: "Organizations", value: profile.totals.organizations },
      ]
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Career</p>
          <h1 className="mt-1 text-3xl font-bold">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Computed from your stored credentials. Evidence, not estimates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/timeline">Timeline</Link>
          </Button>
          <Button asChild>
            <Link href="/credentials/new">
              <Plus />
              Quick Add
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error.message ?? "Could not load career profile"}
        </p>
      )}

      {loading || !profile ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : profile.totals.credentials === 0 ? (
        <Card className="mt-6">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <Archive className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">No career data yet</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Your profile, timeline, and skill history build themselves as you preserve experiences.
            </p>
            <Button className="mt-6 w-full sm:w-auto" asChild>
              <Link href="/credentials/new">
                <Plus />
                Create your first credential
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Experiences by type</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(Object.entries(profile.totals.byType) as [keyof typeof profile.totals.byType, number][])
                  .filter(([, n]) => n > 0)
                  .map(([type, n]) => (
                    <span key={type} className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                      <CredentialTypeBadge type={type} />
                      <span className="font-semibold tabular-nums">{n}</span>
                    </span>
                  ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold tabular-nums">{profile.evidenceCoverage.withEvidence}</span>{" "}
                  experience{profile.evidenceCoverage.withEvidence === 1 ? "" : "s"} with evidence files ·{" "}
                  <span className="font-semibold tabular-nums">{profile.evidenceCoverage.withoutEvidence}</span>{" "}
                  without
                </p>
                <p className="text-muted-foreground">
                  Active years:{" "}
                  {profile.dateRange.earliest && profile.dateRange.latest
                    ? `${yearOf(profile.dateRange.earliest)} to ${yearOf(profile.dateRange.latest)}`
                    : "no dated credentials yet"}
                  {" · "}
                  Top tags:{" "}
                  {profile.topTags.length > 0
                    ? profile.topTags.map((t) => t.name).join(", ")
                    : "none yet"}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Skill history</h2>
          <p className="text-sm text-muted-foreground">
            How often each skill appears in your record, and when you last used it.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="w-44 space-y-1.5">
            <Label htmlFor="skill-sort" className="sr-only">
              Sort skills
            </Label>
            <select id="skill-sort" className={selectClass} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SKILL_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-52 space-y-1.5">
            <Label htmlFor="skill-search" className="sr-only">
              Search skills
            </Label>
            <Input
              id="skill-search"
              placeholder="Search skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {skillsInitialLoading || !skills ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : skills.length > 0 ? (
        <div className="mt-4 space-y-2">
          {skills.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Used in {s.credentialCount} experience{s.credentialCount === 1 ? "" : "s"}
                    {" · "}
                    {s.lastUsed ? `last used ${dayOf(s.lastUsed)}` : "no dated use"}
                    {s.firstUsed && s.lastUsed && s.firstUsed !== s.lastUsed
                      ? ` · first ${dayOf(s.firstUsed)}`
                      : ""}
                  </p>
                </div>
                <div className="flex max-w-full flex-wrap gap-1.5">
                  {s.credentials.slice(0, 4).map((c) => (
                    <Link key={c.id} href={`/credentials/${c.id}`}>
                      <Badge variant="secondary" className="hover:bg-secondary/70">
                        {c.title.length > 28 ? `${c.title.slice(0, 27)}…` : c.title}
                      </Badge>
                    </Link>
                  ))}
                  {s.credentials.length > 4 && (
                    <Badge variant="outline">+{s.credentials.length - 4}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-4">
          <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
            {search || debouncedSearch ? "No skills match your search." : "Skills you link to credentials will appear here."}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
