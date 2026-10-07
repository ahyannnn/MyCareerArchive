"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) {
      // Strict gate: unverified accounts must click the inbox link first.
      const code = `${error.code ?? ""} ${error.message ?? ""}`;
      if (/verif/i.test(code)) {
        setNeedsVerification(true);
        setError("Please verify your email first — check your inbox for the link.");
        return;
      }
      setError(error.message ?? "Sign-in failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function resend() {
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: frontendUrl("/dashboard") });
    if (error) {
      setError(error.message ?? "Could not resend the email");
      return;
    }
    setResent(true);
  }

  async function social(provider: "google" | "github") {
    // Redirects the browser to the provider; Better Auth brings the user
    // back to /api/auth/callback/<provider>, then to callbackURL.
    await authClient.signIn.social({ provider, callbackURL: frontendUrl("/dashboard") });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-sm text-zinc-600">Welcome back to your MyCareerArchive.</p>

      <div className="mt-6 space-y-2">
        <button
          onClick={() => social("google")}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium hover:bg-zinc-100"
        >
          Continue with Google
        </button>
        <button
          onClick={() => social("github")}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium hover:bg-zinc-100"
        >
          Continue with GitHub
        </button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" /> or <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {needsVerification && (
          <button
            type="button"
            onClick={resend}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            {resent ? "Verification email sent — check your inbox" : "Resend verification email"}
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Logging in…" : "Log in with email"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-600">
        No account?{" "}
        <a href="/register" className="font-medium text-zinc-900 underline">
          Register
        </a>{" "}
        ·{" "}
        <a href="/forgot-password" className="font-medium text-zinc-900 underline">
          Forgot password?
        </a>
      </p>
    </main>
  );
}
