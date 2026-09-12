"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderArchive, MessageSquare, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/ansatt/profil", label: "Profil" },
  { href: "/ansatt/personalmappe", label: "Min mappe" },
  { href: "/ansatt/fravaer", label: "Fravær" },
  { href: "/ansatt/onboarding", label: "Onboarding" },
  { href: "/ansatt/medarbeidersamtale", label: "Samtaler" },
] as const;

const ICONS = {
  "/ansatt/profil": User,
  "/ansatt/personalmappe": FolderArchive,
  "/ansatt/fravaer": CalendarDays,
  "/ansatt/onboarding": UserPlus,
  "/ansatt/medarbeidersamtale": MessageSquare,
} as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmployeeHrWorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="HR for deg" className="mb-4 flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
      {ITEMS.map((item) => {
        const Icon = ICONS[item.href];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
