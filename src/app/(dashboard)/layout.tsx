import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";
import { TavleNav, TavleMobileNav } from "@/components/tavle-nav";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { Toaster } from "@/components/ui/toaster";
import { SessionUser } from "@/types";
import { DashboardProviders } from "@/components/dashboard-providers";
import { OfflineSyncBannerWrapper } from "@/components/offline-sync-banner-wrapper";
import { widgetIdsToMenuPaths } from "@/lib/menu-widget-sync";
import { aliasDashboardMenuHrefs } from "@/lib/legal-link-repair";
import { PendingReadConfirmations } from "@/features/documents/components/pending-read-confirmations";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Redirect superadmin og support til admin dashboard
  const user = session.user as SessionUser;
  const sessionUser = session.user;
  if (user.isSuperAdmin || user.isSupport) {
    redirect("/admin");
  }

  // Ansatte uten leder- eller prosjektlederansvar bruker ansattportalen.
  // Leder og prosjektleder skal inn på dashboardet, inkludert avviksoversikten.
  if (user.role === "ANSATT") {
    const extraRoles = sessionUser.extraRoles ?? [];
    const isLeader = extraRoles.includes("LEDER");
    const managesProject = user.tenantId
      ? await prisma.project.count({
          where: { tenantId: user.tenantId, projectManagerId: user.id },
        })
      : 0;
    const isSafetyRep = extraRoles.includes("VERNEOMBUD");
    if (!isLeader && !isSafetyRep && managesProject === 0) {
      const tenantId = user.tenantId;
      const [membership, safetyAreas] = tenantId
        ? await Promise.all([
            prisma.userTenant.findUnique({
              where: { userId_tenantId: { userId: user.id, tenantId } },
              select: { isChiefSafetyRep: true },
            }),
            prisma.department.count({
              where: { tenantId, safetyRepresentativeId: user.id },
            }),
          ])
        : [null, 0];
      if (!membership?.isChiefSafetyRep && safetyAreas === 0) {
        redirect("/ansatt");
      }
    }
  }

  const tenantId = user.tenantId ?? null;

  // Hent tenant-info inkl. isTavleOnly og simpleMenuItems
  let isTavleOnly = false;
  let simpleMenuItems: string[] | null = null;
  let dashboardLocked = false;

  if (tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          simpleMenuItems: true,
          isTavleOnly: true,
          dashboardLocked: true,
          lockedDashboardConfig: true,
        },
      });
      simpleMenuItems = aliasDashboardMenuHrefs((tenant?.simpleMenuItems as string[] | null) ?? null);
      isTavleOnly = tenant?.isTavleOnly ?? false;
      dashboardLocked = (tenant?.dashboardLocked ?? false) && user.role !== "ADMIN";

      if (dashboardLocked && tenant?.lockedDashboardConfig) {
        const lockedWidgets = tenant.lockedDashboardConfig as Array<{ id: string }>;
        const widgetIds = lockedWidgets.map((w) => w.id);
        simpleMenuItems = aliasDashboardMenuHrefs(widgetIdsToMenuPaths(widgetIds));
      }
    } catch {
      // Kolonnen finnes kanskje ikke ennå – bruk standardverdier
    }
  }

  // isTavleOnly-kunder: minimal layout uten full HMS Nova-meny
  if (isTavleOnly) {
    return (
      <div className="flex min-h-dvh flex-col overflow-hidden bg-gray-50 lg:flex-row">
        <TavleMobileNav tenantName={sessionUser.tenantName ?? null} />
        <TavleNav tenantName={sessionUser.tenantName ?? null} />
        <main className="min-w-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 lg:p-8">
          <div className="min-w-0 w-full">
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <DashboardProviders simpleMenuItems={simpleMenuItems} dashboardLocked={dashboardLocked}>
      <div className="flex min-h-dvh flex-col overflow-hidden lg:flex-row">
        <MobileNav />
        <DashboardNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 lg:p-8">
          <div className="min-w-0 w-full">
            <AppBreadcrumbs />
            <OfflineSyncBannerWrapper />
            <PendingReadConfirmations hrefBase="/dashboard/documents" />
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    </DashboardProviders>
  );
}
