import { Skeleton } from "@/components/ui/skeleton";

// Instant shell while the timeline route loads. Year groups stream via the
// client query cache (revisits inside staleTime cost zero requests).
export default function TimelineLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="mt-6 h-36" />
      <div className="mt-8 space-y-10">
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
    </main>
  );
}
