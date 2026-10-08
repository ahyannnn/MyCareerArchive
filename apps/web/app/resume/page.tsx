"use client";

import { useState } from "react";
import { ClipboardCopy, FileText, ListChecks, Printer, SearchX } from "lucide-react";
import { toast } from "sonner";
import {
  CREDENTIAL_TYPES,
  generateApi,
  resumeApi,
  type CredentialType,
  type ResumeBuildResult,
  type ResumeBullets,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialTypeBadge } from "@/components/credential-card";
import { cn } from "@/lib/utils";

export default function ResumePage() {
  const [targetRole, setTargetRole] = useState("");
  const [skill, setSkill] = useState("");
  const [tag, setTag] = useState("");
  const [types, setTypes] = useState<CredentialType[]>([]);
  const [result, setResult] = useState<ResumeBuildResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bullets, setBullets] = useState<ResumeBullets[] | null>(null);
  const [bulletsBusy, setBulletsBusy] = useState(false);

  function toggleType(t: CredentialType) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function build(fromSelection: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await resumeApi.build({
        targetRole: targetRole.trim() || undefined,
        skill: skill.trim() || undefined,
        tag: tag.trim() || undefined,
        includeTypes: types.length > 0 ? types : undefined,
        credentialIds: fromSelection && selected.length > 0 ? selected : undefined,
        limit: 20,
      });
      setResult(res);
      setSelected(res.matched.map((c) => c.id));
      setBullets(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build resume");
    } finally {
      setLoading(false);
    }
  }

  async function generateBullets() {
    if (selected.length === 0) return;
    setBulletsBusy(true);
    try {
      setBullets(await generateApi.bullets(selected));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate bullets");
    } finally {
      setBulletsBusy(false);
    }
  }

  async function copyAllBullets() {
    if (!bullets) return;
    const text = bullets.map((b) => `${b.title}\n${b.lines.map((l) => `• ${l}`).join("\n")}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Bullets copied to clipboard");
    } catch {
      toast.error("Could not copy. Select the bullets manually.");
    }
  }

  async function copyMarkdown() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      toast.success("Resume markdown copied to clipboard");
    } catch {
      toast.error("Could not copy. Select the preview text manually");
    }
  }

  const allSelected = result !== null && selected.length === result.matched.length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Career</p>
        <h1 className="mt-1 text-3xl font-bold">Resume builder</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Describe a target role and the builder ranks your stored experiences by keyword overlap, then
          assembles markdown using only recorded information. Nothing is invented; AI phrasing arrives in
          Phase 9.
        </p>
      </div>

      <Card className="mt-6 print:hidden">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="role">Target role</Label>
            <Input
              id="role"
              placeholder='e.g. Backend Developer. Try "backend", "design", "teaching"…'
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill">Skill filter</Label>
            <Input id="skill" placeholder="e.g. Node.js" value={skill} onChange={(e) => setSkill(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag">Tag filter</Label>
            <Input id="tag" placeholder="e.g. portfolio" value={tag} onChange={(e) => setTag(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Limit to types (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {CREDENTIAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    types.includes(t)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:border-primary/40",
                  )}
                  aria-pressed={types.includes(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <Button onClick={() => build(false)} disabled={loading}>
              {loading ? "Building…" : "Find matching experiences"}
            </Button>
            {result && result.matched.length > 0 && (
              <Button variant="outline" onClick={() => build(true)} disabled={loading || selected.length === 0}>
                Regenerate from {selected.length} selected
              </Button>
            )}
            {result && selected.length > 0 && (
              <Button variant="outline" onClick={generateBullets} disabled={bulletsBusy}>
                <ListChecks />
                {bulletsBusy ? "Generating…" : `Bullets for ${selected.length} selected`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && result && result.matched.length === 0 && (
        <Card className="mt-6">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <SearchX className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">No matching experiences</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Try a broader role keyword, or clear the skill/tag/type filters.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && result && result.matched.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2 print:hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Matched ({selected.length}/{result.matched.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(allSelected ? [] : result.matched.map((c) => c.id))}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
            </CardHeader>
            <CardContent className="max-h-[480px] space-y-2 overflow-y-auto">
              {result.matched.map((c) => (
                <label
                  key={c.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors",
                    selected.includes(c.id) ? "border-primary/50 bg-primary/5" : "border-input",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={selected.includes(c.id)}
                    onChange={() =>
                      setSelected((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                    }
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      <CredentialTypeBadge type={c.type} />
                    </span>
                    {c.description && (
                      <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{c.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 print:hidden">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Preview
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyMarkdown}>
                  <ClipboardCopy />
                  Copy markdown
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[560px] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/60 p-4 font-mono text-xs leading-relaxed print:max-h-none print:overflow-visible print:bg-transparent">
                {result.markdown}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground print:hidden">
                Uses only your stored titles, dates, organizations, skills, and links.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && bullets && bullets.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 print:hidden">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" />
              Resume bullets
            </CardTitle>
            <Button variant="outline" size="sm" onClick={copyAllBullets}>
              <ClipboardCopy />
              Copy all bullets
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {bullets.map((b) => (
              <div key={b.credentialId}>
                <p className="font-medium">{b.title}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {b.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
