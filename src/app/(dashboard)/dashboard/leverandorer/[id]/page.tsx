import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm, type SupplierFormValues } from "@/features/suppliers/components/supplier-form";
import { SupplierLinks } from "@/features/suppliers/components/supplier-links";
import {
  SUPPLIER_STATUS_LABELS,
  type SupplierCriticalityValue,
  type SupplierStatusValue,
} from "@/lib/supplier-management";
import { getSupplier, listSupplierLinkOptions } from "@/server/queries/supplier.queries";

export const dynamic = "force-dynamic";

function ymd(value: Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(value: Date | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();
  const options = await listSupplierLinkOptions(id);

  const initial: SupplierFormValues = {
    id: supplier.id,
    name: supplier.name,
    orgNumber: supplier.orgNumber ?? "",
    scope: supplier.scope ?? "",
    status: supplier.status as SupplierStatusValue,
    criticality: supplier.criticality as SupplierCriticalityValue,
    criteria: supplier.criteria ?? "",
    nextReviewAt: ymd(supplier.nextReviewAt),
    validUntil: ymd(supplier.validUntil),
    notes: supplier.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground">
            {SUPPLIER_STATUS_LABELS[supplier.status as SupplierStatusValue]}
            {supplier.performance.score === null
              ? ` · ${supplier.performance.label}`
              : ` · Ytelse ${supplier.performance.label} (${supplier.performance.score})`}
            {supplier.approvedAt
              ? ` · Godkjent ${formatDate(supplier.approvedAt)}${supplier.approvedBy?.name ? ` av ${supplier.approvedBy.name}` : ""}`
              : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/audits/new?type=SUPPLIER&supplierId=${supplier.id}`}>Ny leverandørrevisjon</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evalueringer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplier.audits.length === 0 ? <p className="text-muted-foreground">Ingen revisjoner er koblet.</p> : null}
            {supplier.audits.map((audit) => (
              <p key={audit.id}>
                <Link href={`/dashboard/audits/${audit.id}`} className="hover:underline">
                  {audit.title}
                </Link>
                <span className="text-muted-foreground"> · {formatDate(audit.scheduledDate)}</span>
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avvik fra leverandør</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplier.incidents.length === 0 ? <p className="text-muted-foreground">Ingen avvik er koblet.</p> : null}
            {supplier.incidents.map((incident) => (
              <p key={incident.id}>
                <Link href={`/dashboard/incidents/${incident.id}`} className="hover:underline">
                  {incident.title}
                </Link>
                <span className="text-muted-foreground"> · {incident.status}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Koble eksisterende oppfølging</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierLinks supplierId={supplier.id} audits={options.audits} incidents={options.incidents} />
        </CardContent>
      </Card>

      <SupplierForm initial={initial} />
    </div>
  );
}
