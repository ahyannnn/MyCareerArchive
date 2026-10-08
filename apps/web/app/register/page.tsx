"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/frontend-url";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      sessionStorage.setItem("mca-toast", "account-created");
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
    <AuthShell title="Create your vault" description="One account holds every credential and its evidence.">
      <SocialButtons onSocial={social} />

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            type="text"
            required
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
        {inboxNotice && (
          <p role="status" className="rounded-md border border-success/30 bg-success/10 p-3 text-sm">
            Account created for <span className="font-semibold">{email}</span>. Check your inbox
            and click the verification link, then{" "}
            <Link href="/login" className="underline underline-offset-4">
              log in
            </Link>
            .
          </p>
        )}
        <Button
          type="submit"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={pending}
        >
          {pending ? "Creating…" : "Register with email"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
