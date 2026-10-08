"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "mca-toast";

const MESSAGES: Record<string, string> = {
  "welcome-back": "Welcome back",
  "account-created": "Account created",
};

// Deferred greeting: login/register stash a flag in sessionStorage before
// navigating, and the dashboard toasts once it actually arrives. The flag is
// consumed immediately so a reload never replays the greeting.
export function DashboardToast() {
  useEffect(() => {
    const flag = window.sessionStorage.getItem(STORAGE_KEY);
    if (!flag) return;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const message = MESSAGES[flag];
    if (message) toast.success(message);
  }, []);

  return null;
}
