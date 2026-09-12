"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Building2, LogOut, Sparkles, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { getRoleDisplayName } from "@/lib/permissions";
import Image from "next/image";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSimpleMenuConfig } from "@/hooks/use-simple-menu-config";
import { TenantSwitcher } from "@/components/auth/tenant-switcher";
import { Role } from "@prisma/client";
import { canEnterKonsernFromHms, hasKonsernMenuInHms } from "@/lib/konsern-access";
import { filterDashboardNavItems, sortDashboardNavItems } from "@/lib/dashboard-nav-filter";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";
import { groupNavItemsByHub, partitionNavHubGroups } from "@/lib/dashboard-nav-hub-groups";
import { useDashboardLock } from "@/components/dashboard-providers";
import { DashboardNavFooterLinks, DashboardNavWorkGroups } from "@/components/dashboard-nav-sections";

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session } = useSession();
  const { visibleNavItems, role, permissions } = usePermissions();
  const { isSimpleMode, toggleMode } = useSimpleMode();
  const { simpleMenuItems } = useSimpleMenuConfig();
  const { tenantFeatures, moduleVisibility, tenantIndustry } = useTenantNavContext();
  const { dashboardLocked } = useDashboardLock();

  const effectiveSimpleMode = isSimpleMode || dashboardLocked;

  const allowedNavItems = sortDashboardNavItems(
    filterDashboardNavItems({
      visibleNavItems,
      role: (role as Role | null) ?? null,
      permissions,
      moduleVisibility,
      tenantFeatures,
      tenantIndustry,
      isSimpleMode: effectiveSimpleMode,
      simpleMenuItems,
      hasKonsernMenu: hasKonsernMenuInHms({
        corporateGroupId: session?.user?.corporateGroupId,
        tenantRole: session?.user?.role,
      }),
    }),
    (item) => t(item.label),
  );
  const { workGroups, footerGroups } = partitionNavHubGroups(
    groupNavItemsByHub(allowedNavItems),
  );

  const tenantName = session?.user?.tenantName;

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:h-dvh lg:flex-col">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <Image src="/logo-nova.png" alt="HMS Nova" width={120} height={40} className="h-8 w-auto" />
            <NotificationBell />
          </div>
          {(tenantName || role) && (
            <div className="mt-2 flex items-center gap-2">
              {tenantName && (
                <p className="min-w-0 flex-1 truncate text-xs font-medium">{tenantName}</p>
              )}
              {role && (
                <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                  {getRoleDisplayName(role)}
                </Badge>
              )}
            </div>
          )}
          <TenantSwitcher />
        </div>

        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {isSimpleMode ? (
              <Zap className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-500" />
            )}
            <span className="truncate text-xs font-medium">
              {isSimpleMode ? t("dashboardNav.simpleMode") : t("dashboardNav.advancedMode")}
            </span>
          </div>
          <Switch
            checked={!isSimpleMode}
            onCheckedChange={() => toggleMode()}
            disabled={dashboardLocked}
            className="scale-75"
            aria-label={isSimpleMode ? t("dashboardNav.advancedMode") : t("dashboardNav.simpleMode")}
          />
        </div>

        <DashboardNavWorkGroups groups={workGroups} pathname={pathname} />
        <DashboardNavFooterLinks groups={footerGroups} pathname={pathname} />

        <div className="border-t px-2 py-2">
          <p className="truncate px-2 pb-1 text-[11px] text-muted-foreground">
            {session?.user?.name || session?.user?.email}
          </p>
          {session?.user?.corporateGroupId &&
            canEnterKonsernFromHms(session.user.role) && (
            <Link href="/konsern">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Konsern
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start px-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("auth.logout")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
