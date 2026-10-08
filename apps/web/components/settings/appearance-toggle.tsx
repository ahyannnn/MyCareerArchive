"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "mca-theme";

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function AppearanceToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <span className="flex items-center justify-between gap-4">
      <span className="text-sm">
        <span className="font-medium">{theme === "dark" ? "Dark" : "Light"} mode</span>
        <span className="block text-muted-foreground">
          {theme === "dark"
            ? "Easier on the eyes at night."
            : "Warm paper background during the day."}
        </span>
      </span>
      <Button type="button" variant="outline" size="sm" onClick={toggle}>
        {theme === "dark" ? <Sun /> : <Moon />}
        Switch to {theme === "dark" ? "light" : "dark"}
      </Button>
    </span>
  );
}
