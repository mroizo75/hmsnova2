import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { NySamtaleForm } from "@/features/employee-reviews/components/ny-samtale-form";

export default async function NyMedarbeidersamtalePage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canCreateEmployeeReviews) redirect("/dashboard/medarbeidersamtale");

  const userTenants = await prisma.userTenant.findMany({
    where: { tenantId: auth.tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const employees = userTenants.map((ut) => ut.user);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">Planlegg ny medarbeidersamtale</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Du vil bli satt som leder for samtalen. Ansatt kan legge inn forberedelse fra
          sin side.
        </p>
      </div>

      <NySamtaleForm employees={employees} />
    </div>
  );
}
