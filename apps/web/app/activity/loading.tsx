import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="space-y-6">
        <Skeleton className="h-6 w-full rounded-b-lg" />
        <Skeleton className="h-6 w-full rounded-b-lg" />
        <Skeleton className="h-6 w-full rounded-b-lg" />
        <Skeleton className="h-6 w-full rounded-b-lg" />
        <Skeleton className="h-6 w-full rounded-b-lg" />
      </div>
    </main>
  );
}