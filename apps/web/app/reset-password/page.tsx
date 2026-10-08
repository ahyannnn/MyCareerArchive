"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// Landed on from the email link, which the API redirects here as
// /reset-password?token=… after validating the request server-side.
function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setError(error.message ?? "Reset failed. The link may have expired. Request a new one.");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        This page needs a reset link. Use the latest email, or{" "}
        <a href="/forgot-password" className="font-medium text-zinc-900 underline">
          request a new one
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input
        type="password"
        required
        minLength={8}
        placeholder="New password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

// useSearchParams() requires a Suspense boundary in Next.js — without this
// wrapper the production build fails.
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
