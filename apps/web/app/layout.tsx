import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Vault",
  description: "Personal career/credential vault — Phase 1 foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
