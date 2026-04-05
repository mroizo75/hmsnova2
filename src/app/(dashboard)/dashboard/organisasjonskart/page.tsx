import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { OrgChartTree } from "@/features/organization/components/org-chart-tree";
import { Building2 } from "lucide-react";

export default async function OrgChartPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til bedrift</div>;
  }

  const tenantId = userTenant.tenantId;
  const permissions = getPermissions(userTenant.role);

  const nodes = await prisma.orgChartNode.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Organisasjonskart
            </h1>
            <p className="text-muted-foreground">
              Hierarkisk oversikt over roller, ansvar og organisering (AML § 3-1)
            </p>
          </div>
        </div>
      </div>

      <OrgChartTree
        nodes={nodes.map((n) => ({
          id: n.id,
          parentId: n.parentId,
          title: n.title,
          name: n.name,
          department: n.department,
          sortOrder: n.sortOrder,
        }))}
        canManage={permissions.canManageUsers}
      />
    </div>
  );
}
