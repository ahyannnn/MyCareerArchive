"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, SearchX } from "lucide-react";
import {
  CREDENTIAL_TYPES,
  credentialsApi,
  organizationsApi,
  type CredentialList,
  type OrganizationRef,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialCard } from "@/components/credential-card";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const SORTS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "created-desc", label: "Recently added" },
  { value: "created-asc", label: "Added long ago" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface Filters {
  search: string;
  type: string;
  skill: string;
  tag: string;
  organizationId: string;
  year: string;
  sort: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  type: "",
  skill: "",
  tag: "",
  organizationId: "",
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

export default function VaultPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<CredentialList | null>(null);
  const [orgs, setOrgs] = useState<OrganizationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebounced(filters, 350);

  const set = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  useEffect(() => {
    organizationsApi.list().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    credentialsApi
      .list({
        search: debounced.search || undefined,
        type: debounced.type || undefined,
        skill: debounced.skill || undefined,
        tag: debounced.tag || undefined,
        organizationId: debounced.organizationId || undefined,
        year: debounced.year ? Number(debounced.year) : undefined,
        sort: debounced.sort,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) {
          setList(res);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message ?? "Could not load credentials");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page]);

  const totalPages = list ? Math.max(1, Math.ceil(list.meta.total / PAGE_SIZE)) : 1;
  const hasActiveFilters =
    filters.search || filters.type || filters.skill || filters.tag || filters.organizationId || filters.year;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Vault</p>
          <h1 className="mt-1 text-3xl font-bold">Credentials</h1>
          {!loading && list && (
            <p className="mt-1 text-sm text-muted-foreground">
              {list.meta.total} result{list.meta.total === 1 ? "" : "s"}
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

      <Card className="mt-6">
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
            <Label htmlFor="sort">Sort</Label>
            <select
              id="sort"
              className={selectClass}
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization</Label>
            <select
              id="org"
              className={selectClass}
              value={filters.organizationId}
              onChange={(e) => set({ organizationId: e.target.value })}
            >
              <option value="">All organizations</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
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
          <div className={cn("flex items-end", !hasActiveFilters && "invisible")}>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (list?.data.length ?? 0) > 0 ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list!.data.map((c) => (
              <CredentialCard key={c.id} credential={c} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Page {list!.meta.page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="mt-4">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <SearchX className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">No results found</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setPage(1);
                  }}
                >
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
    </main>
  );
}
