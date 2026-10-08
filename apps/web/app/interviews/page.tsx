"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCopy, MessagesSquare, Printer, SearchX } from "lucide-react";
import { toast } from "sonner";
import { generateApi, type InterviewQuestion } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewsPage() {
  const [skill, setSkill] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [totalCredentials, setTotalCredentials] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepare() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateApi.prepare({ skill: skill.trim() || undefined, limit: 12 });
      setQuestions(res.questions);
      setTotalCredentials(res.totalCredentials);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare questions");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!questions) return;
    const text = questions
      .map((q) => `${q.question}\n${q.talkingPoints.map((t) => `  - ${t}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Questions copied to clipboard");
    } catch {
      toast.error("Could not copy. Select the questions manually.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Career</p>
        <h1 className="mt-1 text-3xl font-bold">Interview preparation</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Likely questions about your recorded experiences, each paired with talking points citing
          your evidence. Built from stored records. Nothing is invented.
        </p>
      </div>

      <Card className="mt-6 print:hidden">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="skill">Focus on a skill (optional)</Label>
            <Input
              id="skill"
              placeholder="e.g. Node.js — leave empty for recent experiences"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") prepare();
              }}
            />
          </div>
          <Button onClick={prepare} disabled={loading}>
            <MessagesSquare />
            {loading ? "Preparing…" : "Prepare questions"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {!loading && questions && questions.length === 0 && (
        <Card className="mt-4">
          <CardContent className="mx-auto max-w-md px-6 py-12 text-center">
            <SearchX className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold">No experiences to prepare with</h2>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              {skill ? (
                <>No credentials mention that skill. Try a broader term or clear the filter.</>
              ) : (
                <>
                  Add credentials to your{" "}
                  <Link href="/credentials" className="underline underline-offset-4">
                    vault
                  </Link>{" "}
                  and they will turn into questions here.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && questions && questions.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-muted-foreground">
              {questions.length} question{questions.length === 1 ? "" : "s"} from {totalCredentials}{" "}
              experience{totalCredentials === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyAll}>
                <ClipboardCopy />
                Copy all
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer />
                Print
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {questions.map((q, i) => (
              <Card key={`${q.credentialId}-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                    {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Talking points ·{" "}
                    <Link
                      href={`/credentials/${q.credentialId}`}
                      className="underline underline-offset-4"
                    >
                      {q.credentialTitle}
                    </Link>
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {q.talkingPoints.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
