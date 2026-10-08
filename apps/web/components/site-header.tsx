import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/server-session";
import { Button } from "@/components/ui/button";
import { SignOutMenu } from "@/components/site-header-user";

// Shared app shell: brand + primary nav + session menu. Rendered from the
// root layout so every page inherits it; auth pages show brand + entry
// links, signed-in pages show vault nav + the account menu.
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>

        {user && (
          <nav className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/credentials">Vault</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/timeline">Timeline</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/career">Career</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/jobs">Jobs</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
              <Link href="/resume">Resume</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
              <Link href="/portfolio">Portfolio</Link>
            </Button>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <SignOutMenu email={user.email} />
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
