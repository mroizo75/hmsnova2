"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { Badge } from "./ui/badge";

const allNavItems = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard, supportAccess: true },
  { href: "/admin/registrations", label: "Nye registreringer", icon: UserPlus, supportAccess: true },
  { href: "/admin/tenants", label: "Bedrifter", icon: Building2, supportAccess: true },
  { href: "/admin/invoices", label: "Fakturaer", icon: FileText, supportAccess: true },
  { href: "/admin/users", label: "Brukere", icon: Users, supportAccess: false },
  { href: "/admin/settings", label: "Innstillinger", icon: Settings, supportAccess: false },
];

interface SuperAdminNavProps {
  isSuperAdmin: boolean;
  isSupport: boolean;
}

export function SuperAdminNav({ isSuperAdmin, isSupport }: SuperAdminNavProps) {
  const pathname = usePathname();
  
  // Filtrer navigasjon basert på rolle
  const navItems = isSuperAdmin 
    ? allNavItems 
    : allNavItems.filter(item => item.supportAccess);

  return (
    <aside className="w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
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
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 space-y-2">
          <Button
            asChild
            variant="outline"
            className="w-full justify-start"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="mr-3 h-4 w-4" />
              Til kundedashboard
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logg ut
          </Button>
        </div>
      </div>
    </aside>
  );
}

