import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";
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
  if (user.isSuperAdmin || user.isSupport) {
    redirect("/admin");
  }

  // VIKTIG: Redirect ANSATT til employee dashboard
  if (user.role === "ANSATT") {
    redirect("/ansatt");
  }

  const tenantId = user.tenantId ?? null;
  let simpleMenuItems: string[] | null = null;
  if (tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { simpleMenuItems: true },
      });
      simpleMenuItems = (tenant?.simpleMenuItems as string[] | null) ?? null;
    } catch {
      // Kolonnen simpleMenuItems finnes kanskje ikke ennå (migrering ikke kjørt) – bruk standard meny
    }
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

