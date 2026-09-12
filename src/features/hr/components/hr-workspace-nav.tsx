"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  FolderArchive,
  LayoutDashboard,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { HR_WORKSPACE_ITEMS, isHrWorkspacePath } from "@/lib/hr-workspace";
import type { VisibleNavItems } from "@/lib/permissions";

const ICONS = {
  "/dashboard/hr": LayoutDashboard,
  "/dashboard/personalarkiv": FolderArchive,
  "/dashboard/fravaer": CalendarDays,
  "/dashboard/onboarding": UserPlus,
  "/dashboard/medarbeidersamtale": MessageSquare,
  "/dashboard/avdelinger": Building2,
} as const;

export function HrWorkspaceNav() {
  const pathname = usePathname();
  const { visibleNavItems } = usePermissions();

  const items = HR_WORKSPACE_ITEMS.filter((item) => visibleNavItems[item.permission as keyof VisibleNavItems]);
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        HR-arbeidsflyt
      </p>
      <nav
        aria-label="HR-moduler"
        className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1"
      >
        {items.map((item) => {
          const Icon = ICONS[item.href];
          const active = isHrWorkspacePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-background",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
