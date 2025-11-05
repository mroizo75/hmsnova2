"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  AlertCircle,
  GraduationCap,
  ClipboardCheck,
  ListTodo,
  Target,
  Settings,
  LogOut,
  ClipboardList,
  Beaker,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { getRoleDisplayName } from "@/lib/permissions";
import Image from "next/image";

const navItems = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard" as const },
  { href: "/dashboard/documents", label: "nav.documents", icon: FileText, permission: "documents" as const },
  { href: "/dashboard/forms", label: "nav.forms", icon: ClipboardList, permission: "forms" as const },
  { href: "/dashboard/risks", label: "nav.risks", icon: AlertTriangle, permission: "risks" as const },
  { href: "/dashboard/incidents", label: "nav.incidents", icon: AlertCircle, permission: "incidents" as const },
  { href: "/dashboard/inspections", label: "nav.inspections", icon: ShieldCheck, permission: "inspections" as const },
  { href: "/dashboard/chemicals", label: "nav.chemicals", icon: Beaker, permission: "chemicals" as const },
  { href: "/dashboard/training", label: "nav.training", icon: GraduationCap, permission: "training" as const },
  { href: "/dashboard/audits", label: "nav.audits", icon: ClipboardCheck, permission: "audits" as const },
  { href: "/dashboard/actions", label: "nav.actions", icon: ListTodo, permission: "actions" as const },
  { href: "/dashboard/goals", label: "nav.goals", icon: Target, permission: "goals" as const },
  { href: "/dashboard/settings", label: "nav.settings", icon: Settings, permission: "settings" as const },
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session } = useSession();
  const { visibleNavItems, role } = usePermissions();
  const [open, setOpen] = useState(false);

  // Filtrer navigasjon basert på tilganger
  const allowedNavItems = navItems.filter((item) => visibleNavItems[item.permission]);

  return (
    <div className="lg:hidden">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <Image src="/logo-nova.png" alt="HMS Nova" width={100} height={65} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <VisuallyHidden.Root>
                <SheetTitle>Navigasjonsmeny</SheetTitle>
              </VisuallyHidden.Root>
              <div className="flex h-full flex-col">
                <div className="border-b p-6">
                  <Image src="/logo-nova.png" alt="HMS Nova" width={155} height={100} />
                  {role && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {getRoleDisplayName(role)}
                    </Badge>
                  )}
                </div>
                <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                  {allowedNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {t(item.label)}
                      </Link>
                    );
                  })}
                </nav>
                <div className="border-t p-4">
                  <div className="mb-3 px-3 text-xs text-muted-foreground truncate">
                    {session?.user?.name || session?.user?.email}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    {t("auth.logout")}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

