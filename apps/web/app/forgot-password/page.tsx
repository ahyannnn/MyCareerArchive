"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <AuthShell title="Forgot password" description="Enter your account email and we'll send a reset link.">
      {done ? (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm">
          <p>
            If an account exists for <span className="font-semibold">{email}</span>, a reset link is
            on its way (expires in 1 hour).
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" loading={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
