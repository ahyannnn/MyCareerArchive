import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-6 w-3/4 mb-4" />
    </main>
  );
}