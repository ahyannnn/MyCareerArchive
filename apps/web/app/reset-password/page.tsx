"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="text-sm text-muted-foreground">
        <p>This page needs a reset link. Use the latest email, or</p>
        <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
          request a new one
        </Link>
        .
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="Pick a strong password you haven't used before.">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
