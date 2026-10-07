"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";

// Always answers neutrally: whether or not the email exists, the user sees
// the same message, so addresses can't be probed through this form.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset({ email, redirectTo: frontendUrl("/reset-password") });
    setPending(false);
    setDone(true);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Forgot password</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your account email and we&apos;ll send a reset link.
      </p>

      {done ? (
        <p className="mt-6 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          If an account exists for <span className="font-semibold">{email}</span>, a reset link is
          on its way (expires in 1 hour).
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-zinc-600">
        <a href="/login" className="font-medium text-zinc-900 underline">
          Back to login
        </a>
      </p>
    </main>
  );
}
