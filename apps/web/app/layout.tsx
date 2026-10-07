import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "MyCareerArchive",
  description: "MyCareerArchive — personal career archive",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
