"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    toast.success("Welcome back");
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
    <main className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-sm flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>Welcome back to your MyCareerArchive.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => social("google")}>
              Continue with Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => social("github")}>
              Continue with GitHub
            </Button>
          </div>

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
            <Button type="submit" className="w-full" disabled={pending}>
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
        </CardContent>
      </Card>
    </main>
  );
}
