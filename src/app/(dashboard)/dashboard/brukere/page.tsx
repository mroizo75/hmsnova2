import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Users } from "lucide-react";
import { getPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { fetchUsers } from "@/server/queries/users.queries";
import { UsersContent } from "@/features/settings/components/users-content";

export const dynamic = "force-dynamic";

export default async function BrukerePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

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
  const permissions = getPermissions(selectedMembership.role as Role);

  if (!permissions.canManageUsers) {
    redirect("/dashboard");
  }

  const initialData = await fetchUsers();

  if (!initialData) {
    redirect("/login");
  }

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

      <UsersContent initialData={initialData} />
    </div>
  );
}
