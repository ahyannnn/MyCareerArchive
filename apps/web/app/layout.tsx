import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteHeaderSkeleton } from "@/components/site-header-skeleton";
import { SideNav } from "@/components/side-nav";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MyCareerArchive: Never lose track of what you accomplished",
    template: "%s · MyCareerArchive",
  },
  description:
    "Capture projects, certificates, and proof now. Turn them into resumes, portfolios, and job matches later.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "MyCareerArchive, your personal career evidence system",
    description:
      "Store every project, certificate, and piece of evidence in one searchable vault.",
    type: "website",
  },
};

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus-top-0 focus:left-0 z-20">
        Skip to main content
      </a>
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader />
      </Suspense>
      <div className="flex items-start">
        <QueryProvider>
          <SideNav />
          <div id="main-content" className="min-w-0 flex-1">
            {children}
          </div>
        </QueryProvider>
      </div>
      <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
