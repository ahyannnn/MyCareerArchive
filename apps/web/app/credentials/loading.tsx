import { Skeleton } from "@/components/ui/skeleton";

// Instant shell while the vault route loads. The list itself streams via the
// client query cache (revisits inside staleTime cost zero requests).
export default function CredentialsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="mt-6 h-44" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    </main>
  );
}
