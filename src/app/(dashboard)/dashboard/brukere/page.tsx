import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { UserManagement } from "@/features/settings/components/user-management";
import { Users } from "lucide-react";
import { getPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BrukerePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("settingsPage");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      tenants: {
        include: { tenant: true },
        where: session.user.tenantId ? { tenantId: session.user.tenantId } : undefined,
        take: 1,
      },
    },
  });

  if (!user || user.tenants.length === 0) redirect("/login");

  const selectedMembership = user.tenants[0];
  const tenantId = selectedMembership.tenantId;
  const tenant = selectedMembership.tenant;
  const permissions = getPermissions(selectedMembership.role as Role);
  const isAdmin = selectedMembership.role === "ADMIN";

  if (!permissions.canManageUsers) {
    redirect("/dashboard");
  }

  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const usersWithEmployeeNumber = tenantUsers.map((ut) => ({
    ...ut,
    employeeNumber: ut.employeeNumber ?? null,
    position: ut.position ?? null,
    managerId: ut.managerId ?? null,
  }));

  const { getSubscriptionLimits } = await import("@/lib/subscription");
  const limits = getSubscriptionLimits(tenant.pricingTier as any);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:gap-3 sm:text-3xl">
            <Users className="h-6 w-6 shrink-0 text-blue-600 sm:h-8 sm:w-8" />
            Brukere
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Administrer ansatte, roller og tilganger i bedriften
          </p>
        </div>
      </div>

      <UserManagement
        users={usersWithEmployeeNumber}
        currentUserId={user.id}
        isAdmin={isAdmin}
        pricingTier={tenant.pricingTier}
        maxUsers={limits.maxUsers}
      />
    </div>
  );
}
