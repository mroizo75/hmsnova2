import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { ConstructionComplianceClient } from "@/features/projects/components/construction-compliance-client";

export default async function ProjectConstructionCompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const membership = user.tenants.find(
    (tenantMembership) => tenantMembership.tenantId === session.user.tenantId,
  );
  if (!membership) {
    return <div>Ingen tilgang</div>;
  }
  const tenantId = membership.tenantId;
  const permissions = getPermissions(membership.role);
  if (!permissions.canReadConstructionCompliance) {
    redirect("/dashboard");
  }

  const project = await prisma.project.findUnique({
    where: { id, tenantId },
    select: { id: true, name: true },
  });
  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bygg/anlegg-compliance</h1>
        <p className="text-sm text-muted-foreground">
          Prosjekt: {project.name}
        </p>
      </div>

      <ConstructionComplianceClient
        projectId={project.id}
        canManage={permissions.canManageConstructionCompliance}
      />
    </div>
  );
}
