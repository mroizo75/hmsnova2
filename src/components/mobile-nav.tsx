"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { LogOut, Menu, Sparkles, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { getRoleDisplayName } from "@/lib/permissions";
import Image from "next/image";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSimpleMenuConfig } from "@/hooks/use-simple-menu-config";
import { Role } from "@prisma/client";
import { hasKonsernMenuInHms } from "@/lib/konsern-access";
import { filterDashboardNavItems, sortDashboardNavItems } from "@/lib/dashboard-nav-filter";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";
import { groupNavItemsByHub, partitionNavHubGroups } from "@/lib/dashboard-nav-hub-groups";
import { useDashboardLock } from "@/components/dashboard-providers";
import { DashboardNavFooterLinks, DashboardNavWorkGroups } from "@/components/dashboard-nav-sections";

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session } = useSession();
  const { visibleNavItems, role, permissions } = usePermissions();
  const { isSimpleMode, toggleMode } = useSimpleMode();
  const { simpleMenuItems } = useSimpleMenuConfig();
  const { dashboardLocked } = useDashboardLock();
  const { tenantFeatures, moduleVisibility, tenantIndustry } = useTenantNavContext();
  const [open, setOpen] = useState(false);

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

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-50 border-b bg-card pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 py-2">
          <Image src="/logo-nova.png" alt="HMS Nova" width={100} height={32} className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Åpne meny">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <VisuallyHidden.Root>
                <SheetTitle>{t("mobileNav.navigationMenu")}</SheetTitle>
              </VisuallyHidden.Root>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="border-b px-4 py-3">
                  <Image src="/logo-nova.png" alt="HMS Nova" width={120} height={40} className="h-8 w-auto" />
                  {role && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {getRoleDisplayName(role)}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between border-b px-4 py-2">
                  <div className="flex items-center gap-2">
                    {isSimpleMode ? (
                      <Zap className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-purple-500" />
                    )}
                    <span className="text-xs font-medium">
                      {isSimpleMode ? t("mobileNav.simpleMode") : t("mobileNav.advancedMode")}
                    </span>
                  </div>
                  <Switch
                    checked={!isSimpleMode}
                    onCheckedChange={() => toggleMode()}
                    disabled={dashboardLocked}
                    className="scale-75"
                  />
                </div>

                <DashboardNavWorkGroups
                  groups={workGroups}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
                <DashboardNavFooterLinks
                  groups={footerGroups}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
                <div className="border-t px-3 py-2">
                  <p className="mb-1 truncate px-2 text-[11px] text-muted-foreground">
                    {session?.user?.name || session?.user?.email}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start"
                    onClick={() => {
                      setOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("auth.logout")}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
