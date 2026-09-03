"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Building2, FileText, LogOut, Sparkles, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { getRoleDisplayName } from "@/lib/permissions";
import Image from "next/image";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSimpleMenuConfig } from "@/hooks/use-simple-menu-config";
import { TenantSwitcher } from "@/components/auth/tenant-switcher";
import { Role } from "@prisma/client";
import { canEnterKonsernFromHms, hasKonsernMenuInHms } from "@/lib/konsern-access";
import { filterDashboardNavItems, sortDashboardNavItems } from "@/lib/dashboard-nav-filter";
import { DASHBOARD_NAV_ICONS } from "@/lib/dashboard-nav-icons";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";
import { groupNavItemsByHub } from "@/lib/dashboard-nav-hub-groups";
import { useDashboardLock } from "@/components/dashboard-providers";

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
  const navHubGroups = groupNavItemsByHub(allowedNavItems);

  const tenantName = session?.user?.tenantName;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:h-dvh lg:flex-col">
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <div className="flex items-start justify-between mb-2">
            <Image src="/logo-nova.png" alt="HMS Nova" width={155} height={100} />
            <NotificationBell />
          </div>
          {tenantName && (
            <p className="text-sm font-semibold text-foreground mt-3 truncate">
              {tenantName}
            </p>
          )}
          {role && (
            <Badge variant="outline" className="mt-2 text-xs">
              {getRoleDisplayName(role)}
            </Badge>
          )}

          <div className="mt-3">
            <TenantSwitcher />
          </div>
        </div>

        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSimpleMode ? (
                <Zap className="h-4 w-4 text-blue-500" />
              ) : (
                <Sparkles className="h-4 w-4 text-purple-500" />
              )}
              <span className="text-xs font-medium">
                {isSimpleMode ? t("dashboardNav.simpleMode") : t("dashboardNav.advancedMode")}
              </span>
            </div>
            <Switch
              checked={!isSimpleMode}
              onCheckedChange={() => toggleMode()}
              disabled={dashboardLocked}
              className="scale-75"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {dashboardLocked
              ? "Låst av administrator"
              : isSimpleMode
                ? t("dashboardNav.simpleDescription")
                : t("dashboardNav.advancedDescription")}
          </p>
        </div>

        <nav className="flex-1 space-y-4 p-4 overflow-y-auto">
          {navHubGroups.map((group) => (
            <div key={group.hub} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.labelKey)}
              </p>
              {group.items.map((item) => {
                const Icon = DASHBOARD_NAV_ICONS[item.href] ?? FileText;
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
                    {t(item.label)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
            {session?.user?.name || session?.user?.email}
          </div>
          <div className="mb-1">
            <PwaInstallButton />
          </div>
          {session?.user?.corporateGroupId &&
            canEnterKonsernFromHms(session.user.role) && (
            <Link href="/konsern">
              <Button
                variant="ghost"
                className="mb-1 w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Building2 className="mr-3 h-4 w-4" />
                Konsern-dashboard
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {t("auth.logout")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
