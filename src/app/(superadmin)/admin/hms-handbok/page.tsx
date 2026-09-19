import { prisma } from "@/lib/db";
import { HandbookServiceFillForm } from "@/features/admin/components/handbook-service-fill-form";

export const metadata = {
  title: "HMS-håndbok | HMS Nova Admin",
};

export default async function AdminHandbookServicePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; groupId?: string }>;
}) {
  const params = await searchParams;

  const [tenants, groups] = await Promise.all([
    prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        orgNumber: true,
        address: true,
        postalCode: true,
        city: true,
        industry: true,
        contactPerson: true,
        hmsContactName: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.corporateGroup.findMany({
      select: {
        id: true,
        name: true,
        tenants: {
          where: { status: "ACTIVE" },
          select: { tenantId: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const fillGroups = groups.map((group) => ({
    id: group.id,
    name: group.name,
    tenantIds: group.tenants.map((item) => item.tenantId),
  }));

  const initialTenantIds = params.tenantId ? [params.tenantId] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HMS-håndbok</h1>
        <p className="text-muted-foreground">
          Fyll HMS-håndboken for én, flere eller alle bedrifter i et konsern. Hver bedrift får eget utkast.
        </p>
      </div>

      <HandbookServiceFillForm
        tenants={tenants}
        groups={fillGroups}
        initialGroupId={params.groupId}
        initialTenantIds={initialTenantIds}
      />
    </div>
  );
}
