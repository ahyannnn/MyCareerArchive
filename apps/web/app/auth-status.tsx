"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// Session-aware block for the homepage: shows who is signed in (or the
// login/register entry points) using the client's reactive session state.
export function AuthStatus() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <p className="text-sm text-zinc-500">Checking session…</p>;
  }

  if (!session) {
    return (
      <div className="flex gap-3">
        <a
          href="/login"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Log in
        </a>
        <a
          href="/register"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100"
        >
          Register
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-zinc-700">
        Signed in as <span className="font-semibold">{session.user.email}</span>
      </p>
      <a
        href="/dashboard"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Dashboard
      </a>
      <button
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100"
      >
        Sign out
      </button>
    </div>
  );
}
