"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange, Plus, SearchX } from "lucide-react";
import {
  CREDENTIAL_TYPES,
} from "@/lib/api-client";
import { useTimeline } from "@/lib/queries";import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialCard, CredentialTypeBadge } from "@/components/credential-card";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface Filters {
  search: string;
  type: string;
  skill: string;
  tag: string;
  year: string;
  sort: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  type: "",
  skill: "",
  tag: "",
  year: "",
  sort: "date-desc",
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function TimelinePage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const debounced = useDebounced(filters, 350);

  const set = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const { data: result, isLoading: loading, error } = useTimeline({
    search: debounced.search || undefined,
    type: debounced.type || undefined,
    skill: debounced.skill || undefined,
    tag: debounced.tag || undefined,
    year: debounced.year ? Number(debounced.year) : undefined,
    sort: debounced.sort,
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const hasActiveFilters =
    filters.search || filters.type || filters.skill || filters.tag || filters.year;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Career</p>
          <h1 className="mt-1 text-3xl font-bold">Timeline</h1>
          {!loading && result && (
            <p className="mt-1 text-sm text-muted-foreground">
              {result.meta.total} experience{result.meta.total === 1 ? "" : "s"} across{" "}
              {result.meta.totalYears} year{result.meta.totalYears === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/credentials/new">
            <Plus />
            New credential
          </Link>
        </Button>
      </div>

      <Card className="mt-6 print:hidden">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Title, description, skill, tag…"
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className={selectClass}
              value={filters.type}
              onChange={(e) => set({ type: e.target.value })}
            >
              <option value="">All types</option>
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              inputMode="numeric"
              placeholder="e.g. 2026"
              value={filters.year}
              onChange={(e) => set({ year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill">Skill</Label>
            <Input
              id="skill"
              placeholder="e.g. Node.js"
              value={filters.skill}
              onChange={(e) => set({ skill: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag">Tag</Label>
            <Input
              id="tag"
              placeholder="e.g. portfolio"
              value={filters.tag}
              onChange={(e) => set({ tag: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort">Order</Label>
            <select
              id="sort"
              className={selectClass}
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value })}
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
            </select>
          </div>
          <div className={cn("flex items-end sm:col-span-2 lg:col-span-2", !hasActiveFilters && "invisible")}>
            <Button variant="outline" className="w-full" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error.message ?? "Could not load timeline"}
        </p>
      )}

      {loading ? (
        <div className="mt-6 space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-7 w-24" />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-36" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (result?.data.length ?? 0) > 0 ? (
        <div className="mt-8 space-y-10">
          {result!.data.map((group) => (
            <section key={group.year ?? "undated"} aria-label={group.year ? `Year ${group.year}` : "Undated"}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarRange className="size-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold tabular-nums">{group.year ?? "Undated"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {group.count} experience{group.count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="ml-2 hidden flex-wrap gap-1.5 sm:flex" aria-hidden>
                  {Array.from(new Set(group.credentials.map((c) => c.type)))
                    .slice(0, 4)
                    .map((t) => (
                      <CredentialTypeBadge key={t} type={t} />
                    ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-l-2 border-border pl-4 sm:pl-6 md:grid-cols-2 lg:grid-cols-3">
                {group.credentials.map((c) => (
                  <CredentialCard key={c.id} credential={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <SearchX className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">Nothing on the timeline yet</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your filters to find what you're looking for."
                : "Add dated credentials and they will appear here chronologically."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {hasActiveFilters && (
                <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              )}
              <Button asChild>
                <Link href="/credentials/new">
                  <Plus />
                  New credential
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && result && result.meta.total > PAGE_SIZE && (
        <Card className="mt-8 print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Showing first {PAGE_SIZE} of {result.meta.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Narrow the timeline with search or filters, or browse everything in the{" "}
              <Link href="/credentials" className="underline underline-offset-4">
                vault
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
