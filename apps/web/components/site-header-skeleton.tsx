import { Skeleton } from "@/components/ui/skeleton";

// Instant header shell rendered while <SiteHeader/> awaits the session.
// Used as the <Suspense> fallback in the root layout so client-side
// navigations paint immediately instead of blocking on getSessionUser().
export function SiteHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Skeleton className="h-6 w-36" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </header>
  );
}
