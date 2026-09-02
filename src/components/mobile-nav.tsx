"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { FileText, LogOut, Menu, Sparkles, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { getRoleDisplayName } from "@/lib/permissions";
import Image from "next/image";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSimpleMenuConfig } from "@/hooks/use-simple-menu-config";
import { Role } from "@prisma/client";
import { hasKonsernMenuInHms } from "@/lib/konsern-access";
import { filterDashboardNavItems, sortDashboardNavItems } from "@/lib/dashboard-nav-filter";
import { DASHBOARD_NAV_ICONS } from "@/lib/dashboard-nav-icons";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";
import { groupNavItemsByHub } from "@/lib/dashboard-nav-hub-groups";

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session } = useSession();
  const { visibleNavItems, role, permissions } = usePermissions();
  const { isSimpleMode, toggleMode } = useSimpleMode();
  const { simpleMenuItems } = useSimpleMenuConfig();
  const { tenantFeatures, moduleVisibility, tenantIndustry } = useTenantNavContext();
  const [open, setOpen] = useState(false);

  const allowedNavItems = sortDashboardNavItems(
    filterDashboardNavItems({
      visibleNavItems,
      role: (role as Role | null) ?? null,
      permissions,
      moduleVisibility,
      tenantFeatures,
      tenantIndustry,
      isSimpleMode,
      simpleMenuItems,
      hasKonsernMenu: hasKonsernMenuInHms({
        corporateGroupId: session?.user?.corporateGroupId,
        tenantRole: session?.user?.role,
      }),
    }),
    (item) => t(item.label),
  );
  const navHubGroups = groupNavItemsByHub(allowedNavItems);

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-50 border-b bg-card pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Image src="/logo-nova.png" alt="HMS Nova" width={100} height={65} />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Åpne meny">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <VisuallyHidden.Root>
                <SheetTitle>{t("mobileNav.navigationMenu")}</SheetTitle>
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

                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSimpleMode ? (
                        <Zap className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="text-sm font-medium">
                        {isSimpleMode ? t("mobileNav.simpleMode") : t("mobileNav.advancedMode")}
                      </span>
                    </div>
                    <Switch
                      checked={!isSimpleMode}
                      onCheckedChange={() => toggleMode()}
                    />
                  </div>
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
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
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
                    </div>
                  ))}
                </nav>
                <div className="border-t p-4">
                  <div className="mb-3 px-3 text-xs text-muted-foreground truncate">
                    {session?.user?.name || session?.user?.email}
                  </div>
                  <div className="mb-1">
                    <PwaInstallButton />
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
    </div>
  );
}
