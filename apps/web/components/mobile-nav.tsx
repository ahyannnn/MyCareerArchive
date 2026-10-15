"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/credentials", label: "Vault" },
  { href: "/timeline", label: "Timeline" },
  { href: "/career", label: "Career" },
  { href: "/jobs", label: "Jobs" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Navigate</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NAV_LINKS.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link
              href={link.href}
              className={pathname === link.href ? "font-medium text-primary bg-accent/10" : ""}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
