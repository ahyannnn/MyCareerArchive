"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inboxNotice, setInboxNotice] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: frontendUrl("/dashboard"),
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Registration failed");
      return;
    }
    // Strict gate: signup grants no session until the inbox link is clicked.
    // (OAuth signups skip this screen via their own redirect.)
    const { data: session } = await authClient.getSession();
    if (session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setInboxNotice(true);
  }

  async function social(provider: "google" | "github") {
    await authClient.signIn.social({ provider, callbackURL: frontendUrl("/dashboard") });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Create your vault</h1>
      <p className="mt-2 text-sm text-zinc-600">One account holds every credential and its evidence.</p>

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
          type="text"
          required
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2"
        />
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
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {inboxNotice && (
          <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            Account created for <span className="font-semibold">{email}</span>. Check your inbox and
            click the verification link, then <a href="/login" className="underline">log in</a>.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Register with email"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-600">
        Have an account?{" "}
        <a href="/login" className="font-medium text-zinc-900 underline">
          Log in
        </a>
      </p>
    </main>
  );
}
