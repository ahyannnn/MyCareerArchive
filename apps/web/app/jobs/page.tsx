"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Briefcase, GraduationCap, SearchX } from "lucide-react";
import {
  jobsApi,
  type JobsSearchResult,
  type JobScope,
  type QualificationProfile,
  type WorkType,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WORK_TYPES: { value: WorkType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "ONSITE", label: "Onsite" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
];

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  ONSITE: "Onsite",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  UNKNOWN: "Work type not listed",
};

function postedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
}

export default function JobsPage() {
  const [scope, setScope] = useState<JobScope>("local");
  const [profile, setProfile] = useState<QualificationProfile | null>(null);
  const [query, setQuery] = useState("");
  const [workType, setWorkType] = useState<WorkType | "">("");
  const [result, setResult] = useState<JobsSearchResult | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    jobsApi
      .qualifications()
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setLoadingProfile(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const search = useCallback(
    async (override?: { scope?: JobScope; query?: string }) => {
      const activeScope = override?.scope ?? scope;
      const q = (override?.query ?? query).trim();
      // Without skills in the vault there is nothing to match against,
      // so a typed query is required (the API enforces this too).
      if (!q && (profile?.topSkills.length ?? 0) === 0) {
        setError("Type a role to search for, or add skills to your credentials first.");
        return;
      }
      setSearching(true);
      setError(null);
      try {
        const res = await jobsApi.search({
          scope: activeScope,
          query: q || undefined,
          location: activeScope === "local" ? "Philippines" : undefined,
          limit: 20,
        });
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not search jobs");
      } finally {
        setSearching(false);
      }
    },
    [scope, query, profile],
  );

  function switchScope(next: JobScope) {
    setScope(next);
    setWorkType("");
    setResult(null);
    setError(null);
  }

  const visibleJobs = (result?.jobs ?? []).filter((j) => !workType || j.workType === workType);
  const skillCount = profile?.topSkills.length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Career</p>
        <h1 className="mt-1 text-3xl font-bold">Career search</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Which roles you qualify for, based on the skills recorded in your vault. Local covers the
          Philippines (onsite, remote, and hybrid). International covers worldwide remote roles.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="size-4" />
            What you qualify for
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProfile ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : profile && skillCount > 0 ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-semibold tabular-nums">{profile.totalCredentials}</span>{" "}
                experiences
                {profile.yearsActive && (
                  <>
                    {" "}active{" "}
                    {new Date(profile.yearsActive.start).getFullYear()} to{" "}
                    {new Date(profile.yearsActive.end).getFullYear()}
                  </>
                )}
                . Strongest skills:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.topSkills.slice(0, 8).map((s) => (
                  <Badge key={s.id} variant="secondary">
                    {s.name} · {s.credentialCount}
                  </Badge>
                ))}
              </div>
              {profile.suggestedQueries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Try:</span>
                  {profile.suggestedQueries.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery(q);
                        search({ query: q });
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No skills recorded yet.{" "}
              <Link href="/credentials" className="underline underline-offset-4">
                Add skills to your credentials
              </Link>{" "}
              and this panel will summarize what you qualify for. You can still search below with a
              typed role.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2" role="tablist" aria-label="Search scope">
            {(
              [
                { value: "local", label: "Local · Philippines" },
                { value: "international", label: "International · Remote" },
              ] as const
            ).map((t) => (
              <Button
                key={t.value}
                role="tab"
                aria-selected={scope === t.value}
                variant={scope === t.value ? "default" : "outline"}
                onClick={() => switchScope(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="job-query" className="sr-only">
                Role or keywords
              </Label>
              <Input
                id="job-query"
                placeholder={
                  profile?.suggestedQueries[0] ?? "e.g. Node.js developer"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") search();
                }}
              />
            </div>
            <Button onClick={() => search()} disabled={searching}>
              <Briefcase />
              {searching ? "Searching…" : "Search jobs"}
            </Button>
          </div>
          {scope === "local" && (
            <div className="flex flex-wrap gap-1.5">
              {WORK_TYPES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setWorkType(t.value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    workType === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:border-primary/40",
                  )}
                  aria-pressed={workType === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {searching && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {!searching && result && result.jobs.length === 0 && (
        <Card className="mt-4">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <SearchX className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">No matching postings</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Try a broader role keyword or clear the work type filter.
            </p>
          </CardContent>
        </Card>
      )}

      {!searching && result && visibleJobs.length > 0 && (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            {visibleJobs.length} posting{visibleJobs.length === 1 ? "" : "s"} for {result.query}
            {result.cached ? " · results cached to protect the free quota" : ""}
          </p>
          <div className="mt-3 space-y-2">
            {visibleJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {[job.company, job.location].filter(Boolean).join(" · ")}
                        {postedLabel(job.postedAt) ? ` · ${postedLabel(job.postedAt)}` : ""}
                      </p>
                    </div>
                    {job.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={job.url} target="_blank" rel="noreferrer">
                          View posting
                          <ArrowUpRight />
                        </a>
                      </Button>
                    )}
                  </div>
                  {(job.salaryText || job.salaryMin || job.salaryMax) && (
                    <p className="text-sm tabular-nums">
                      {job.salaryText ??
                        `${job.salaryMin ?? "?"} to ${job.salaryMax ?? "?"}`}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{WORK_TYPE_LABEL[job.workType]}</Badge>
                    {result.totalSkills > 0 && (
                      <Badge variant={job.matchedSkills.length > 0 ? "default" : "outline"}>
                        Matches {job.matchedSkills.length} of your {result.totalSkills} skills
                      </Badge>
                    )}
                    {job.matchedSkills.slice(0, 5).map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {job.snippet && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{job.snippet}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {result.scope === "local" ? (
              <>Local listings via JSearch (Google for Jobs aggregate).</>
            ) : (
              <>
                Remote listings by{" "}
                <a
                  href="https://remotive.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  Remotive
                </a>
                .
              </>
            )}
          </p>
        </>
      )}
    </main>
  );
}
