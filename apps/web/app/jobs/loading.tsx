import { Skeleton } from "@/components/ui/skeleton";

// Instant shell while the jobs route loads. The qualification panel streams
// via the client query cache; searches stay user-initiated (provider quota).
export default function JobsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="mt-6 h-40" />
      <Skeleton className="mt-4 h-28" />
    </main>
  );
}
