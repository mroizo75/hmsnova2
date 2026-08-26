import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateInvoiceDialog } from "@/features/admin/components/create-invoice-dialog";
import { InvoiceTable } from "@/features/admin/components/invoice-table";
import { InvoiceExportPanel } from "@/features/admin/components/invoice-export-panel";
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 25;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const searchTerm = params.search?.trim() || "";

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });
  if (!currentUser?.isSuperAdmin) redirect("/admin");

  const searchFilter: Prisma.InvoiceWhereInput = searchTerm
    ? {
        OR: [
          { invoiceNumber: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { period: { contains: searchTerm } },
          { tenant: { name: { contains: searchTerm } } },
          { tenant: { contactEmail: { contains: searchTerm } } },
        ],
      }
    : {};

  const totalItems = await prisma.invoice.count({ where: searchFilter });
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const [invoices, tenants, exportHistory] = await Promise.all([
    prisma.invoice.findMany({
      where: searchFilter,
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
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.invoiceExport.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { exportedBy: { select: { name: true, email: true } } },
    }),
  ]);

  const exportedInvoiceIds = Array.from(
    new Set(
      exportHistory.flatMap((e) => {
        try {
          return JSON.parse(e.invoiceIds) as string[];
        } catch {
          return [];
        }
      })
    )
  );

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
            Fakturahåndtering og Excel-eksport for Fiken ({totalItems} totalt)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AdminPaginationSearch
            basePath="/admin/invoices"
            searchTerm={searchTerm}
            placeholder="Søk faktura, bedrift..."
          />
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

      <InvoiceExportPanel history={exportHistory} exportedInvoiceIds={exportedInvoiceIds} />

      <InvoiceTable invoices={invoices} exportedInvoiceIds={exportedInvoiceIds} />

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/admin/invoices"
        searchTerm={searchTerm}
      />
    </div>
  );
}
