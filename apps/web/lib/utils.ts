import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initialsFor(name?: string | null, email?: string): string {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length === 1) {
    const local = parts[0].split("@")[0];
    return (local.slice(0, 2) || "?").toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
