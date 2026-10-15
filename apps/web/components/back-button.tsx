"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// History-aware back button: goes to the previous page when there is one,
// otherwise falls back to a safe parent route (deep links, fresh tabs).
export function BackButton({ fallbackHref, label = "Back" }: { fallbackHref: string; label?: string }) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={goBack} className="w-fit">
      <ArrowLeft />
      {label}
    </Button>
  );
}
