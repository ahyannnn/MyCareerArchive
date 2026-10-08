import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-4", className)}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* archive lid */}
      <path d="M5 9.5h22v2.6a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 5 12.1V9.5Z" />
      {/* lid handle / clasp */}
      <path d="M13.5 9.5v-1a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
      {/* box body */}
      <path d="M6.5 13.6h19V23a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 23V13.6Z" />
      {/* career growth chevron */}
      <path d="m11.5 20.5 4.5-3.8 4.5 3.8" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <LogoMark className={markClassName} />
      </span>
      {showWordmark && <span className="hidden sm:inline">MyCareerArchive</span>}
    </span>
  );
}
