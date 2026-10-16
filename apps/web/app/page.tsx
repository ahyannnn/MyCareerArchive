import Link from "next/link";
import Image from "next/image";
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

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const HERO_MAIN = {
  src: unsplash("photo-1497032628192-86f99bcd76bc", 1200),
  alt: "Professional organizing a career archive at a desk with laptop and notes",
};

const HERO_CREDENTIALS = {
  src: unsplash("photo-1523580494863-6f3031224c94", 600),
  alt: "Graduates celebrating — credentials and certificates",
};

const HERO_FILES = {
  src: unsplash("photo-1450101499163-c8848c66ca85", 600),
  alt: "Signing a credential document — files kept as proof",
};

const CTA_BG = {
  src: unsplash("photo-1521737604893-d14cc237f11d", 1600),
  alt: "Team collaborating around a table — career growth",
};

const STEPS = [
  {
    icon: Camera,
    step: "01",
    title: "Capture it now",
    body: "Save the project, certificate, or seminar the day it happens. Photos, PDFs, links, and notes included.",
    image: unsplash("photo-1493863641943-9b68992a8d07", 800),
    imageAlt: "Person holding a camera — capture career proof as it happens",
  },
  {
    icon: Tags,
    step: "02",
    title: "Organize with context",
    body: "Attach skills, tags, organizations, and dates so every record stays searchable years later.",
    image: unsplash("photo-1506784983877-45594efa4cbe", 800),
    imageAlt: "Planner and calendar on a desk — organize archive records",
  },
  {
    icon: FileText,
    step: "03",
    title: "Reuse for opportunities",
    body: "Turn your vault into resume bullets, portfolio pages, timelines, and job matches on demand.",
    image: unsplash("photo-1434030216411-0b793f4b4173", 800),
    imageAlt: "Writing notes — reuse archive for resumes and portfolios",
  },
];

const FEATURES = [
  {
    icon: Archive,
    title: "Searchable vault",
    body: "Every credential in one place. Filter by type, year, skill, tag, or organization.",
    image: unsplash("photo-1486312338219-ce68d2c6f44d", 800),
    imageAlt: "Laptop on a desk — searchable career archive vault",
  },
  {
    icon: FileStack,
    title: "Evidence, not just titles",
    body: "Screenshots, certificates, docs, and links live alongside each record as proof.",
    image: unsplash("photo-1454391304352-2bf4678b1a7a", 800),
    imageAlt: "Organized files and documents — evidence kept with each record",
  },
  {
    icon: CalendarDays,
    title: "Career timeline",
    body: "Watch 2024 to 2026 come together chronologically instead of reconstructing it later.",
    image: unsplash("photo-1499750310107-5fef28a66643", 800),
    imageAlt: "Notebook and coffee on a desk — career timeline",
  },
  {
    icon: Briefcase,
    title: "Skill history",
    body: "See which skills you actually used, where, and how often. No invented percentages.",
    image: unsplash("photo-1519389950473-47ba0277781c", 800),
    imageAlt: "Team working with laptops — real skill history",
  },
  {
    icon: FileText,
    title: "Resume and portfolio builder",
    body: "Generate role-targeted bullets and polished project descriptions from real records.",
    image: unsplash("photo-1512314889357-e157c22f938d", 800),
    imageAlt: "Planning notes on a table — resume and portfolio builder",
  },
  {
    icon: Search,
    title: "Jobs and interview prep",
    body: "Match stored experience against job posts and prep with evidence-cited talking points.",
    image: unsplash("photo-1541339907198-e08756dedf3f", 800),
    imageAlt: "University building — credentials and interview preparation",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      {/* Hero */}
      <section className="border-b">
        <div className="grid gap-10 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[2fr_1fr] lg:items-center lg:px-10 lg:pt-20 xl:gap-16 xl:px-16">
          <div className="w-full max-w-3xl justify-self-center">
            <Badge variant="secondary" className="gap-1.5">
              <Archive className="size-3.5" />
              Personal career evidence system
            </Badge>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl fade-in-up">
              Never lose track of what you accomplished.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground fade-in-up" style={{ animationDelay: '100ms' }}>
              Capture projects, certificates, and proof now, so your future self
              does not have to reconstruct them at resume time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-brand text-brand-foreground hover:bg-brand/90 fade-in-up"
                style={{ animationDelay: '200ms' }}
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
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground fade-in-up"
              style={{ animationDelay: '300ms' }}>
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

          {/* Hero photos */}
          <div className="grid w-full max-w-xl gap-4 justify-self-end">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="relative aspect-[16/10]">
                <Image
                  src={HERO_MAIN.src}
                  alt={HERO_MAIN.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  <Briefcase className="size-3.5 text-brand" />
                  Career archive
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3">
                <div className="relative h-24 overflow-hidden rounded-lg sm:h-28">
                  <Image
                    src={HERO_CREDENTIALS.src}
                    alt={HERO_CREDENTIALS.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
                    Credentials
                  </span>
                </div>
                <div className="relative h-24 overflow-hidden rounded-lg sm:h-28">
                  <Image
                    src={HERO_FILES.src}
                    alt={HERO_FILES.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
                    Files as proof
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Photos:{" "}
              <a
                href="https://unsplash.com"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Unsplash
              </a>{" "}
              — career, archive, files &amp; credentials themes.
            </p>
          </div>
        </div>
        {/* Product preview strip */}
        <div className="grid gap-4 px-4 pb-16 sm:px-6 md:grid-cols-3 lg:px-10 lg:pb-20 xl:px-16">
          <Card className="group hover:shadow-md group-hover:-translate-y-0.5">
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
            <Card className="group hover:shadow-md group-hover:-translate-y-0.5">
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
            <Card className="group hover:shadow-md group-hover:-translate-y-0.5">
              <CardContent className="space-y-1.5 p-4 text-sm">
                <p className="font-semibold">Backend Developer match</p>
                <p className="text-muted-foreground">
                  3 overlapping skills, 1 certificate plus 3 more
                </p>
                <Badge variant="success">Strong fit</Badge>
              </CardContent>
            </Card>
        </div>
      </section>

      {/* Problem strip */}
      <section className="px-4 py-14 sm:px-6 lg:px-10 xl:px-16">
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
        <div className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20 xl:px-16">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Capture evidence now, reuse it forever.
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {STEPS.map((s) => (
              <Card key={s.step} className="group overflow-hidden hover:shadow-xl group-hover:border-primary/20 transition-all">
                <div className="relative h-40">
                  <Image
                    src={s.image}
                    alt={s.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
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
      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20 xl:px-16">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          What you get
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
          One vault, every career output.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative h-36">
                <Image
                  src={f.image}
                  alt={f.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <CardContent className="p-6">
                <f.icon className="size-5 text-brand" />
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Photos:{" "}
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Unsplash
          </a>{" "}
          — archive, files, career &amp; credentials themes.
        </p>
      </section>

      {/* Output proof */}
      <section className="border-y bg-secondary/40">
        <div className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20 xl:px-16">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Built from real records, not invented.
          </h2>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <Card className="group hover:shadow-md group-hover:-translate-y-0.5">
              <CardContent className="space-y-2 p-5 text-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Resume bullet</p>
                <p className="text-muted-foreground">
                  Shipped a REST API with auth and Postgres. Backed by
                  certificate, notes, and event photo.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-md group-hover:-translate-y-0.5">
              <CardContent className="space-y-2 p-5 text-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Portfolio block</p>
                <p className="text-muted-foreground">
                  Polished project story generated from your description, skills,
                  and evidence links.
                </p>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-md group-hover:-translate-y-0.5">
              <CardContent className="space-y-2 p-5 text-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Job overlap</p>
                <p className="text-muted-foreground">
                  Node.js, REST API, and PostgreSQL matched against the posting.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20 xl:px-16">
        <Card className="relative overflow-hidden bg-primary text-primary-foreground">
          <Image
            src={CTA_BG.src}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/60" aria-hidden />
          <CardContent className="relative px-6 py-12 text-center sm:px-12">
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
          anytime. Photo:{" "}
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Unsplash
          </a>
          .
        </p>
      </section>
    </main>
  );
}
