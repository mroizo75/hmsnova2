import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, AlertCircle } from "lucide-react";

export default async function SuperAdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Superadmin Dashboard</h1>
        <p className="text-muted-foreground">
          Administrer bedrifter, brukere og fakturering
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totalt bedrifter
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTenants} aktive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktive abonnementer
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.trialSubscriptions} i prøveperiode
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ubetalte fakturaer
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueInvoices} forfalt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Månedlig inntekt (MRR)
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.mrr.toLocaleString("no-NO")} kr
            </div>
            <p className="text-xs text-muted-foreground">
              ARR: {(stats.mrr * 12).toLocaleString("no-NO")} kr
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nylige bedrifter</CardTitle>
            <CardDescription>
              Siste 5 registrerte bedrifter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
                    </p>
                  </div>
                  <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
                    {tenant.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forfalt betalinger</CardTitle>
            <CardDescription>
              Bedrifter med forfalt faktura
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.tenantsWithOverdueInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen forfalte fakturaer 🎉
              </p>
            ) : (
              <div className="space-y-4">
                {stats.tenantsWithOverdueInvoices.map((item) => (
                  <div key={item.tenant.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.overdueAmount.toLocaleString("no-NO")} kr
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {item.overdueCount} faktura(er)
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function getStats() {
  const [
    totalTenants,
    activeTenants,
    activeSubscriptions,
    trialSubscriptions,
    unpaidInvoices,
    overdueInvoices,
    subscriptions,
    recentTenants,
    overdueInvoicesByTenant,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.invoice.count({ where: { status: { in: ["PENDING", "SENT", "OVERDUE"] } } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", billingInterval: "MONTHLY" },
    }),
    prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.groupBy({
      by: ["tenantId"],
      where: { status: "OVERDUE" },
      _count: { id: true },
      _sum: { amount: true },
    }),
  ]);

  const mrr = subscriptions.reduce((sum, sub) => sum + sub.price, 0);

  const tenantsWithOverdueInvoices = await Promise.all(
    overdueInvoicesByTenant.map(async (item) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: item.tenantId },
      });
      return {
        tenant: tenant!,
        overdueCount: item._count.id,
        overdueAmount: item._sum.amount || 0,
      };
    })
  );

  return {
    totalTenants,
    activeTenants,
    activeSubscriptions,
    trialSubscriptions,
    unpaidInvoices,
    overdueInvoices,
    mrr,
    recentTenants,
    tenantsWithOverdueInvoices,
  };
}

