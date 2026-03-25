import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateInvoiceDialog } from "@/features/admin/components/create-invoice-dialog";
import { InvoiceTable } from "@/features/admin/components/invoice-table";
import { SyncInvoicesButton } from "@/components/sync-invoices-button";

export default async function InvoicesPage() {
  const [invoices, tenants] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        tenant: {
          select: {
            name: true,
            contactEmail: true,
            invoiceEmail: true,
          },
        },
      },
      orderBy: { dueDate: "desc" },
      take: 200,
    }),
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stats = {
    pending: invoices.filter((i) => i.status === "PENDING").length,
    sent: invoices.filter((i) => i.status === "SENT").length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    overdue: invoices.filter((i) => i.status === "OVERDUE").length,
    totalUnpaid: invoices
      .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
      .reduce((sum, i) => sum + i.amount, 0),
    totalPaid: invoices
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fakturaer</h1>
          <p className="text-muted-foreground">
            Manuell fakturahåndtering og oppfølging
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncInvoicesButton />
          <CreateInvoiceDialog tenants={tenants} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ikke sendt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sendt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Forfalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Betalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utestående
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUnpaid.toLocaleString("no-NO")} kr
            </div>
            <p className="text-xs text-muted-foreground">
              Betalt: {stats.totalPaid.toLocaleString("no-NO")} kr
            </p>
          </CardContent>
        </Card>
      </div>

      <InvoiceTable invoices={invoices} />
    </div>
  );
}
