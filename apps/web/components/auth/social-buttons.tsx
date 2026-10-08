"use client";

import { Button } from "@/components/ui/button";

export function SocialButtons({
  onSocial,
}: {
  onSocial: (provider: "google" | "github") => void | Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full" onClick={() => onSocial("google")}>
        Continue with Google
      </Button>
      <Button variant="outline" className="w-full" onClick={() => onSocial("github")}>
        Continue with GitHub
      </Button>
    </div>
  );
}
