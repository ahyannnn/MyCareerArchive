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
      <div className="flex h-14 w-full items-center gap-4 px-4 sm:px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          aria-label="MyCareerArchive home"
          className="flex shrink-0 items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2">
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
