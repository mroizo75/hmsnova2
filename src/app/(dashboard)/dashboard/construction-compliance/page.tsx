import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { HardHat } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { fetchConstructionComplianceOverview } from "@/server/queries/project.queries";
import { ConstructionComplianceOverviewContent } from "@/features/projects/components/construction-compliance-overview-content";

export default async function ConstructionComplianceOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang</div>;
  }

  const membership = user.tenants.find(
    (tenantMembership) => tenantMembership.tenantId === session.user.tenantId,
  );
  if (!membership) {
    return <div>Ingen tilgang</div>;
  }
  const permissions = getPermissions(membership.role);
  if (!permissions.canReadConstructionCompliance) {
    redirect("/dashboard");
  }

  const initialData = await fetchConstructionComplianceOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <HardHat className="h-8 w-8 text-amber-600" />
          Bygg/anlegg-compliance
        </h1>
        <p className="text-muted-foreground">
          Oversikt over SHA-plan, forhåndsmelding og daglig kontroll av elektronisk oversiktsliste.
        </p>
      </div>

      <ConstructionComplianceOverviewContent initialData={initialData} />
    </div>
  );
}
