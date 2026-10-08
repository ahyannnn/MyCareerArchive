import Link from "next/link";
import { Check } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Card } from "@/components/ui/card";

const PANEL_POINTS = [
  "Capture proof the day it happens",
  "Search anything in seconds",
  "Build resumes from real records",
];

function BrandRow({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <span
        className={
          light
            ? "flex size-7 items-center justify-center rounded-md bg-primary-foreground text-primary"
            : "flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
        }
      >
        <LogoMark />
      </span>
      <span>MyCareerArchive</span>
    </Link>
  );
}

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-4xl flex-col justify-center px-4 py-10">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          {/* Brand panel: solid ink, no gradient */}
          <div className="hidden bg-primary p-8 text-primary-foreground md:flex md:flex-col">
            <BrandRow light />
            <p className="mt-8 font-display text-3xl leading-tight tracking-tight">
              Your career, kept.
            </p>
            <p className="mt-2 text-sm text-primary-foreground/70">
              One private vault for every project, certificate, and piece of
              proof.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {PANEL_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand">
                    <Check className="size-3 text-brand-foreground" strokeWidth={3} />
                  </span>
                  <span className="text-primary-foreground/90">{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-8 text-xs text-primary-foreground/60">
              Private by default. Export anytime.
            </p>
          </div>

          {/* Form column */}
          <div className="p-6 sm:p-8">
            <div className="md:hidden">
              <BrandRow />
            </div>
            <h1 className="mt-4 font-display text-2xl tracking-tight md:mt-0">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </Card>
    </main>
  );
}
