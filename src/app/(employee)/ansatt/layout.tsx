import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/ansatt/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { OfflineSyncBannerWrapper } from "@/components/offline-sync-banner-wrapper";
import {
  EMPLOYEE_WIDGET_REGISTRY,
  getEmployeeWidgetsFromLockedConfig,
  getEmployeeBottomNavItems,
} from "@/features/dashboard/lib/employee-widget-registry";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.isSuperAdmin || session.user.isSupport) {
    redirect("/admin");
  }

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true, name: true },
    }),
    session.user.tenantId
      ? prisma.tenant.findUnique({
          where: { id: session.user.tenantId },
          select: {
            timeRegistrationEnabled: true,
            dashboardLocked: true,
            lockedDashboardConfig: true,
            ruhModuleEnabled: true,
          },
        })
      : null,
  ]);

  let allWidgets = tenant?.dashboardLocked && tenant.lockedDashboardConfig
    ? getEmployeeWidgetsFromLockedConfig(tenant.lockedDashboardConfig as Array<{ id: string }>)
    : [...EMPLOYEE_WIDGET_REGISTRY];

  if (!tenant?.timeRegistrationEnabled) {
    allWidgets = allWidgets.filter((w) => w.id !== "emp-time");
  }

  if (tenant && !tenant.ruhModuleEnabled) {
    allWidgets = allWidgets.filter((w) => w.id !== "emp-ruh");
  }

  const bottomNavItems = getEmployeeBottomNavItems(allWidgets);

  return (
    <NotificationsProvider>
      <div className="min-h-dvh bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm pt-[env(safe-area-inset-top)]">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-nova.png"
                  alt="HMS Nova"
                  width={155}
                  height={100}
                  className="h-16 w-auto"
                  priority
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-xs text-gray-500">Ansatt</p>
                </div>

                <NotificationBell />

                <Link
                  href="/ansatt/profil"
                  className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold hover:opacity-90 transition-opacity shadow-md"
                  title="Min profil"
                >
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/${user.image}`}
                      alt="Profilbilde"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{session.user.name?.charAt(0)?.toUpperCase() || "?"}</span>
                  )}
                </Link>

                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <AppBreadcrumbs />
          <OfflineSyncBannerWrapper />
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-16 items-center justify-around">
            <Link
              href="/ansatt"
              className="flex min-h-11 flex-1 flex-col items-center justify-center h-full hover:bg-gray-50 transition-colors"
            >
              <Home className="h-5 w-5 text-gray-600" />
              <span className="text-xs mt-1 text-gray-600">Hjem</span>
            </Link>

            {bottomNavItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-11 flex-1 flex-col items-center justify-center h-full hover:bg-gray-50 transition-colors"
              >
                <item.icon className="h-5 w-5 text-gray-600" />
                <span className="text-xs mt-1 text-gray-600">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </NotificationsProvider>
  );
}
