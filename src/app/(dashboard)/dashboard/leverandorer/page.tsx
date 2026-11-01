import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import {
  SUPPLIER_CRITICALITY_LABELS,
  SUPPLIER_STATUS_LABELS,
  type SupplierCriticalityValue,
  type SupplierStatusValue,
} from "@/lib/supplier-management";
import { listSuppliers } from "@/server/queries/supplier.queries";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export default async function SuppliersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const suppliers = await listSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Leverandører</h1>
            <p className="text-muted-foreground">
              Godkjenning, kriterier, evaluering og re-evaluering (ISO 9001:2015 pkt. 8.4).
            </p>
          </div>
          <PageHelpDialog content={helpContent.suppliers} />
        </div>
        <Button asChild>
          <Link href="/dashboard/leverandorer/ny">Ny leverandør</Link>
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen leverandører er registrert ennå.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Kritikalitet</th>
                <th className="px-4 py-3 font-medium">Ytelse</th>
                <th className="px-4 py-3 font-medium">Re-evaluering</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/leverandorer/${supplier.id}`} className="font-medium hover:underline">
                      {supplier.name}
                    </Link>
                    {supplier.orgNumber ? (
                      <p className="text-xs text-muted-foreground">{supplier.orgNumber}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{SUPPLIER_STATUS_LABELS[supplier.status as SupplierStatusValue]}</td>
                  <td className="px-4 py-3">
                    {SUPPLIER_CRITICALITY_LABELS[supplier.criticality as SupplierCriticalityValue]}
                  </td>
                  <td className="px-4 py-3">
                    {supplier.performance.score === null
                      ? supplier.performance.label
                      : `${supplier.performance.label} (${supplier.performance.score})`}
                    {supplier.openDeviations > 0 ? (
                      <p className="text-xs text-muted-foreground">{supplier.openDeviations} åpne avvik</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{formatDate(supplier.nextReviewAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
