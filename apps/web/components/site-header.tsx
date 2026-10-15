import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/server-session";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/site-header-user";
import { MobileNav } from "@/components/mobile-nav";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>

{user && (
          <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Primary">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" aria-current={(typeof window !== "undefined" && window.location.pathname === "/dashboard") ? "page" : undefined}>
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/credentials" aria-current={(typeof window !== "undefined" && window.location.pathname.startsWith("/credentials")) ? "page" : undefined}>
                Vault
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/timeline" aria-current={(typeof window !== "undefined" && window.location.pathname === "/timeline") ? "page" : undefined}>
                Timeline
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/career" aria-current={(typeof window !== "undefined" && window.location.pathname === "/career") ? "page" : undefined}>
                Career
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/jobs" aria-current={(typeof window !== "undefined" && window.location.pathname === "/jobs") ? "page" : undefined}>
                Jobs
              </Link>
            </Button>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <AccountMenu name={user.name} email={user.email} />
              <MobileNav />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
