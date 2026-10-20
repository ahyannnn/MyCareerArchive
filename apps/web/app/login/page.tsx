"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[login] onSubmit start", { email });
    setError(null);
    setNeedsVerification(false);
    setPending(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      console.log("[login] signIn.email result", res);
      const { error } = (res ?? {}) as { error?: { code?: string; message?: string } };
      setPending(false);
      if (error) {
        console.log("[login] signIn.email error", error);
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
      console.log("[login] success, navigating to /dashboard");
      sessionStorage.setItem("mca-toast", "welcome-back");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("[login] signIn.email threw", err);
      setPending(false);
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
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
    console.log("[login] social start", provider);
    try {
      const res = await authClient.signIn.social({ provider, callbackURL: frontendUrl("/dashboard") });
      console.log("[login] signIn.social result", res);
    } catch (err) {
      console.error("[login] signIn.social threw", err);
    }
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
          loading={pending}
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
