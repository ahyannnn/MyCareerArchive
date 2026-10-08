import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Check,
  FileStack,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
} from "lucide-react";
import { getSessionUser } from "@/lib/server-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: Camera,
    step: "01",
    title: "Capture it now",
    body: "Save the project, certificate, or seminar the day it happens. Photos, PDFs, links, and notes included.",
  },
  {
    icon: Tags,
    step: "02",
    title: "Organize with context",
    body: "Attach skills, tags, organizations, and dates so every record stays searchable years later.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Reuse for opportunities",
    body: "Turn your vault into resume bullets, portfolio pages, timelines, and job matches on demand.",
  },
];

const FEATURES = [
  {
    icon: Archive,
    title: "Searchable vault",
    body: "Every credential in one place. Filter by type, year, skill, tag, or organization.",
  },
  {
    icon: FileStack,
    title: "Evidence, not just titles",
    body: "Screenshots, certificates, docs, and links live alongside each record as proof.",
  },
  {
    icon: CalendarDays,
    title: "Career timeline",
    body: "Watch 2024 to 2026 come together chronologically instead of reconstructing it later.",
  },
  {
    icon: Briefcase,
    title: "Skill history",
    body: "See which skills you actually used, where, and how often. No invented percentages.",
  },
  {
    icon: FileText,
    title: "Resume and portfolio builder",
    body: "Generate role-targeted bullets and polished project descriptions from real records.",
  },
  {
    icon: Search,
    title: "Jobs and interview prep",
    body: "Match stored experience against job posts and prep with evidence-cited talking points.",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      {/* Hero */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <Badge variant="secondary" className="gap-1.5">
              <Archive className="size-3.5" />
              Personal career evidence system
            </Badge>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Never lose track of what you accomplished.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Capture projects, certificates, and proof now, so your future self
              does not have to reconstruct them at resume time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Link href="/register">
                  Start archiving free
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Private by default
              </li>
              <li className="inline-flex items-center gap-1.5">
                <FileStack className="size-4 text-primary" />
                Files stay attached as proof
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                Resume ready outputs
              </li>
            </ul>
          </div>

          {/* Product preview */}
          <div className="relative">
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">
                    Backend Development Certificate
                  </p>
                  <span className="inline-flex shrink-0 items-center rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    CERTIFICATE
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Completed an intensive backend course covering APIs, auth, and
                  relational database design.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    2025
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" />
                    ABC Tech
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileStack className="size-3.5" />
                    3 files
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">Node.js</Badge>
                  <Badge variant="secondary">REST API</Badge>
                  <Badge variant="secondary">PostgreSQL</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="absolute -bottom-8 -left-2 w-64 shadow-sm sm:-left-6">
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <FileStack className="size-4 text-brand" />
                  3 evidence files
                </p>
                <p className="text-muted-foreground">
                  Certificate PDF, event photo, study notes
                </p>
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="size-3.5" />
                  Verified proof attached
                </p>
              </CardContent>
            </Card>
            <Card className="absolute -top-7 -right-2 hidden w-56 shadow-sm sm:block lg:-right-4">
              <CardContent className="space-y-1.5 p-4 text-sm">
                <p className="font-semibold">Backend Developer match</p>
                <p className="text-muted-foreground">
                  3 overlapping skills, 1 certificate plus 3 more
                </p>
                <Badge variant="success">Strong fit</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem strip */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Resume time means memory hunt", "You scramble through old drives and chats to remember what you did in 2024."],
            ["Certificates scattered", "PDFs in email, photos on your phone, links in bookmarks. Nothing in one place."],
            ["Bullets with no proof", "You claim skills on paper but cannot point to the project or file behind them."],
          ].map(([title, body]) => (
            <Card key={title} className="bg-card">
              <CardContent className="p-5">
                <p className="font-semibold">{title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Capture evidence now, reuse it forever.
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {STEPS.map((s) => (
              <Card key={s.step}>
                <CardContent className="p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <s.icon className="size-5" />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {s.step}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{s.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          What you get
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
          One vault, every career output.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <f.icon className="size-5 text-brand" />
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Output proof */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Built from real records, not invented.
          </h2>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <Card>
              <CardContent className="space-y-2 p-5 text-sm">
                <Badge>Resume bullet</Badge>
                <p className="text-muted-foreground">
                  Shipped a REST API with auth and Postgres. Backed by
                  certificate, notes, and event photo.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-5 text-sm">
                <Badge>Portfolio block</Badge>
                <p className="text-muted-foreground">
                  Polished project story generated from your description, skills,
                  and evidence links.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-5 text-sm">
                <Badge variant="success">Job overlap: 3 skills</Badge>
                <p className="text-muted-foreground">
                  Node.js, REST API, and PostgreSQL matched against the posting.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Card className="overflow-hidden bg-primary text-primary-foreground">
          <CardContent className="px-6 py-12 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl font-display text-3xl tracking-tight text-balance sm:text-4xl">
              Your future self will thank you.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">
              Save your first accomplishment today. It takes a minute and it
              lasts your whole career.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href="/register">
                  Create free account
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Free for personal use. Your data stays scoped to your account. Export
          anytime.
        </p>
      </section>
    </main>
  );
}
