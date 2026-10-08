"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        setError("Please verify your email first. Check your inbox for the link.");
        return;
      }
      setError(error.message ?? "Sign-in failed");
      return;
    }
    sessionStorage.setItem("mca-toast", "welcome-back");
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
    toast.success("Verification email sent");
  }

  async function social(provider: "google" | "github") {
    // Redirects the browser to the provider; Better Auth brings the user
    // back to /api/auth/callback/<provider>, then to callbackURL.
    await authClient.signIn.social({ provider, callbackURL: frontendUrl("/dashboard") });
  }

  return (
    <AuthShell title="Log in" description="Welcome back to your archive.">
      <SocialButtons onSocial={social} />

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

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
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {needsVerification && (
          <Button type="button" variant="outline" className="w-full" onClick={resend}>
            {resent ? "Verification email sent. Check your inbox" : "Resend verification email"}
          </Button>
        )}
        <Button
          type="submit"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={pending}
        >
          {pending ? "Logging in…" : "Log in with email"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Register
        </Link>{" "}
        ·{" "}
        <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
          Forgot password?
        </Link>
      </p>
    </AuthShell>
  );
}
