"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  Archive,
  Briefcase,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Search,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  careerApi,
  credentialsApi,
  jobsApi,
  timelineApi,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mca-sidenav-collapsed";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; match: (pathname: string) => boolean }[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/credentials",
    label: "Vault",
    icon: Archive,
    match: (p) => p.startsWith("/credentials"),
  },
  {
    href: "/timeline",
    label: "Timeline",
    icon: CalendarDays,
    match: (p) => p.startsWith("/timeline"),
  },
  {
    href: "/career",
    label: "Career",
    icon: Briefcase,
    match: (p) => p.startsWith("/career"),
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: Search,
    match: (p) => p.startsWith("/jobs"),
  },
];

// Hover/focus prefetch: warm the destination's default query so clicks
// inside the freshness window render instantly instead of refetching.
// Keys mirror lib/queries hooks exactly (React Query drops undefined params
// when hashing, so default-filter objects hit the same cache entries).
const PREFETCH_TTL_MS = 90_000;

const NAV_PREFETCH: Record<string, (client: QueryClient) => void> = {
  "/credentials": (client) => {
    void client.prefetchQuery({
      queryKey: ["credentials", { sort: "date-desc", page: 1, pageSize: 12 }],
      queryFn: () => credentialsApi.list({ sort: "date-desc", page: 1, pageSize: 12 }),
      staleTime: PREFETCH_TTL_MS,
    });
  },
  "/timeline": (client) => {
    void client.prefetchQuery({
      queryKey: ["timeline", { sort: "date-desc", page: 1, pageSize: 50 }],
      queryFn: () => timelineApi.list({ sort: "date-desc", page: 1, pageSize: 50 }),
      staleTime: PREFETCH_TTL_MS,
    });
  },
  "/career": (client) => {
    void client.prefetchQuery({
      queryKey: ["career-profile"],
      queryFn: () => careerApi.profile(),
      staleTime: PREFETCH_TTL_MS,
    });
    void client.prefetchQuery({
      queryKey: ["skill-history", "count", ""],
      queryFn: () => careerApi.skills("count"),
      staleTime: PREFETCH_TTL_MS,
    });
  },
  "/jobs": (client) => {
    void client.prefetchQuery({
      queryKey: ["qualifications"],
      queryFn: () => jobsApi.qualifications(),
      staleTime: PREFETCH_TTL_MS,
    });
  },
};

export function SideNav() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Private mode etc: sidebar just stays expanded.
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        // Ignore persistence failures.
      }
      return !c;
    });
  }

  if (isPending || !session) return null;

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r bg-background transition-[width] md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onMouseEnter={() => NAV_PREFETCH[item.href]?.(queryClient)}
              onFocus={() => NAV_PREFETCH[item.href]?.(queryClient)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "justify-center px-0",
                active ? "bg-accent font-medium text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand" : "Collapse"}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <ChevronsRight className="size-5 shrink-0" /> : <ChevronsLeft className="size-5 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
