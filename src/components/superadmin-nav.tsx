"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Settings,
  LogOut,
  Shield,
  Headphones,
  UserPlus,
  Newspaper,
  Stethoscope,
  Scale,
  BookOpenCheck,
  Brain,
  Menu,
} from "lucide-react";
import { Badge } from "./ui/badge";

const allNavItems = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard, supportAccess: true },
  { href: "/admin/support", label: "Support", icon: Headphones, supportAccess: true },
  { href: "/admin/registrations", label: "Nye registreringer", icon: UserPlus, supportAccess: true },
  { href: "/admin/tenants", label: "Bedrifter", icon: Building2, supportAccess: true },
  { href: "/admin/bht", label: "BHT-kunder", icon: Stethoscope, supportAccess: true },
  { href: "/admin/invoices", label: "Fakturaer", icon: FileText, supportAccess: false },
  { href: "/admin/legal-references", label: "Juridisk register", icon: Scale, supportAccess: true },
  { href: "/admin/routine-library", label: "Rutinebibliotek", icon: BookOpenCheck, supportAccess: true },
  { href: "/admin/intelligence", label: "Intelligence", icon: Brain, supportAccess: false },
  { href: "/admin/blog", label: "Blogg & SEO", icon: Newspaper, supportAccess: false },
  { href: "/admin/newsletter", label: "Nyhetsbrev", icon: FileText, supportAccess: false },
  { href: "/admin/users", label: "Brukere", icon: Users, supportAccess: false },
  { href: "/admin/settings", label: "Innstillinger", icon: Settings, supportAccess: false },
];

interface SuperAdminNavProps {
  isSuperAdmin: boolean;
  isSupport: boolean;
  openSupportCount?: number;
}

function NavLinks({
  navItems,
  pathname,
  openSupportCount,
  onNavigate,
}: {
  navItems: typeof allNavItems;
  pathname: string;
  openSupportCount: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const showBadge = item.href === "/admin/support" && openSupportCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                {openSupportCount > 99 ? "99+" : openSupportCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

function NavFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t p-4 space-y-2">
      <Button asChild variant="outline" className="w-full justify-start">
        <Link href="/dashboard" onClick={onNavigate}>
          <LayoutDashboard className="mr-3 h-4 w-4" />
          Til kundedashboard
        </Link>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onNavigate?.();
          signOut({ callbackUrl: "/login" });
        }}
      >
        <LogOut className="mr-3 h-4 w-4" />
        Logg ut
      </Button>
    </div>
  );
}

export function SuperAdminNav({ isSuperAdmin, isSupport, openSupportCount = 0 }: SuperAdminNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = isSuperAdmin
    ? allNavItems
    : allNavItems.filter((item) => item.supportAccess);

  const brand = (
    <div className="flex items-center gap-2">
      {isSuperAdmin ? (
        <Shield className="h-6 w-6 text-primary" />
      ) : (
        <Headphones className="h-6 w-6 text-blue-600" />
      )}
      <div>
        <h2 className="text-lg font-bold">HMS Nova</h2>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            isSuperAdmin && "bg-primary/10 text-primary",
            isSupport && "bg-blue-100 text-blue-700"
          )}
        >
          {isSuperAdmin ? "SUPERADMIN" : "SUPPORT"}
        </Badge>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-50 border-b bg-card pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {brand}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Åpne meny">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <VisuallyHidden.Root>
                <SheetTitle>Admin-meny</SheetTitle>
              </VisuallyHidden.Root>
              <div className="flex h-full flex-col">
                <div className="border-b p-6">{brand}</div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                  <NavLinks
                    navItems={navItems}
                    pathname={pathname}
                    openSupportCount={openSupportCount}
                    onNavigate={() => setOpen(false)}
                  />
                </nav>
                <NavFooter onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">{brand}</div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <NavLinks
              navItems={navItems}
              pathname={pathname}
              openSupportCount={openSupportCount}
            />
          </nav>
          <NavFooter />
        </div>
      </aside>
    </>
  );
}
