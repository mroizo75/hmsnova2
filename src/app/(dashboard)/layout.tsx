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

  // VIKTIG: Redirect ANSATT til employee dashboard
  if (user.role === "ANSATT") {
    redirect("/ansatt");
  }

  const tenantId = user.tenantId ?? null;

  // Hent tenant-info inkl. isTavleOnly og simpleMenuItems
  let isTavleOnly = false;
  let simpleMenuItems: string[] | null = null;

  if (tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { simpleMenuItems: true, isTavleOnly: true },
      });
      simpleMenuItems = (tenant?.simpleMenuItems as string[] | null) ?? null;
      isTavleOnly = tenant?.isTavleOnly ?? false;
    } catch {
      // Kolonnen finnes kanskje ikke ennå – bruk standardverdier
    }
  }

  // isTavleOnly-kunder: minimal layout uten full HMS Nova-meny
  if (isTavleOnly) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen overflow-hidden bg-gray-50">
        <TavleMobileNav tenantName={sessionUser.tenantName ?? null} />
        <TavleNav tenantName={sessionUser.tenantName ?? null} />
        <main className="flex-1 p-4 lg:p-8 overflow-x-auto overflow-y-auto">
          <div className="max-w-[100vw] lg:max-w-none">
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <DashboardProviders simpleMenuItems={simpleMenuItems}>
      <div className="flex flex-col lg:flex-row min-h-screen overflow-hidden">
        <MobileNav />
        <DashboardNav />
        <main className="flex-1 p-4 lg:p-8 overflow-x-auto overflow-y-auto">
          <div className="max-w-[100vw] lg:max-w-none">
            <AppBreadcrumbs />
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    </DashboardProviders>
  );
}

