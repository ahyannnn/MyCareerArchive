"use client";

import { useState } from "react";
import { ClipboardCopy, LayoutGrid, Printer, SearchX } from "lucide-react";
import { toast } from "sonner";
import {
  CREDENTIAL_TYPES,
  portfolioApi,
  type CredentialType,
  type PortfolioBuildResult,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialCard } from "@/components/credential-card";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function PortfolioPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [skill, setSkill] = useState("");
  const [tag, setTag] = useState("");
  const [result, setResult] = useState<PortfolioBuildResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    setLoading(true);
    setError(null);
    try {
      const res = await portfolioApi.build({
        search: search.trim() || undefined,
        type: (type || undefined) as CredentialType | undefined,
        skill: skill.trim() || undefined,
        tag: tag.trim() || undefined,
        limit: 50,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build portfolio");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Could not copy. Select the text manually");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Career</p>
        <h1 className="mt-1 text-3xl font-bold">Portfolio generator</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Turn any stored experiences, like projects, certificates, and awards, into polished,
          copy-ready markdown cards built only from recorded information.
        </p>
      </div>

      <Card className="mt-6 print:hidden">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Filter by title, description, skill, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select id="type" className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill">Skill</Label>
            <Input id="skill" placeholder="e.g. React" value={skill} onChange={(e) => setSkill(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag">Tag</Label>
            <Input id="tag" placeholder="e.g. portfolio" value={tag} onChange={(e) => setTag(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={build} disabled={loading} className="w-full">
              {loading ? "Generating…" : "Generate portfolio"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      )}

      {!loading && result && result.entries.length === 0 && (
        <Card className="mt-6">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <SearchX className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">No experiences match</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Try broadening your search or clearing the filters.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && result && result.entries.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-muted-foreground">
              {result.entries.length} entr{result.entries.length === 1 ? "y" : "ies"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyText(result.combinedMarkdown, "Combined markdown")}>
                <ClipboardCopy />
                Copy all markdown
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer />
                Print
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {result.entries.map((entry) => (
              <Card key={entry.credential.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 print:hidden">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <LayoutGrid className="size-4" />
                    Entry
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyText(entry.markdown, entry.credential.title)}>
                    <ClipboardCopy />
                    Copy
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <CredentialCard credential={entry.credential} />
                  <pre className="flex-1 whitespace-pre-wrap rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed print:bg-transparent">
                    {entry.markdown}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
