import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  Circle,
} from "lucide-react";

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
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

      {/* Faktura-oppfølging */}
      {stats.invoicesNeedingAttention.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Fakturaer som trenger oppfølging</CardTitle>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/invoices">
                  Alle fakturaer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>
              Fakturaer med status &quot;Ikke sendt&quot; eller &quot;Sendt&quot; som venter på handling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.invoicesNeedingAttention.map((inv) => {
                const daysUntilDue = Math.ceil(
                  (new Date(inv.dueDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                const isUrgent = daysUntilDue <= 3;

                return (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isUrgent
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{inv.tenant.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{inv.amount.toLocaleString("no-NO")} kr</span>
                          <span>•</span>
                          <span>{inv.invoiceNumber || "Uten nr."}</span>
                          {inv.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{inv.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge
                          variant={inv.status === "PENDING" ? "outline" : "secondary"}
                        >
                          {inv.status === "PENDING" ? "Ikke sendt" : "Sendt"}
                        </Badge>
                        <p className={`text-xs mt-1 ${isUrgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          <Clock className="inline h-3 w-3 mr-0.5" />
                          {daysUntilDue < 0
                            ? `${Math.abs(daysUntilDue)}d over forfall`
                            : daysUntilDue === 0
                            ? "Forfaller i dag"
                            : `${daysUntilDue}d til forfall`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Nylige bedrifter</CardTitle>
                <CardDescription>Siste 5 registrerte bedrifter</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/tenants">
                  Se alle
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/admin/tenants/${tenant.id}`}
                  className="flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
                >
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
                    </p>
                  </div>
                  <Badge
                    variant={tenant.status === "ACTIVE" ? "default" : "secondary"}
                  >
                    {tenant.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forfalt betalinger</CardTitle>
            <CardDescription>Bedrifter med forfalt faktura</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.tenantsWithOverdueInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen forfalte fakturaer
              </p>
            ) : (
              <div className="space-y-4">
                {stats.tenantsWithOverdueInvoices.map((item) => (
                  <Link
                    key={item.tenant.id}
                    href={`/admin/tenants/${item.tenant.id}`}
                    className="flex items-center justify-between hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
                  >
                    <div>
                      <p className="font-medium">{item.tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.overdueAmount.toLocaleString("no-NO")} kr
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {item.overdueCount} faktura(er)
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bedrifter som trenger oppmerksomhet */}
      {stats.inactiveTenants.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bedrifter som trenger oppmerksomhet</CardTitle>
                <CardDescription>
                  Aktive bedrifter som ikke har logget inn på over 30 dager
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/tenants">
                  Se alle bedrifter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.inactiveTenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/admin/tenants/${tenant.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Circle className="h-2.5 w-2.5 fill-destructive text-destructive" />
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.userCount} brukere • {tenant.subscription || "Ingen abonnement"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-destructive font-medium">
                      {tenant.lastLoginText}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.recentActivity} hendelser siste 30d
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function getStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalTenants,
    activeTenants,
    activeSubscriptions,
    trialSubscriptions,
    unpaidInvoices,
    overdueInvoices,
    subscriptions,
    recentTenants,
    invoicesNeedingAttention,
    activeTenantsList,
    overdueByTenantRows,
    recentIncidentRows,
    recentDocumentRows,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.invoice.count({
      where: { status: { in: ["PENDING", "SENT", "OVERDUE"] } },
    }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", billingInterval: "MONTHLY" },
    }),
    prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ["PENDING", "SENT"] },
      },
      include: {
        tenant: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      include: {
        users: {
          include: {
            user: { select: { lastLoginAttempt: true } },
          },
        },
        subscription: { select: { plan: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.$queryRaw<{ tenantId: string; cnt: bigint; total: number }[]>`
      SELECT tenantId, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
      FROM Invoice WHERE status = 'OVERDUE'
      GROUP BY tenantId
    `,
    prisma.$queryRaw<{ tenantId: string; cnt: bigint }[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Incident
      WHERE createdAt >= ${thirtyDaysAgo}
      GROUP BY tenantId
    `,
    prisma.$queryRaw<{ tenantId: string; cnt: bigint }[]>`
      SELECT tenantId, COUNT(*) as cnt FROM Document
      WHERE createdAt >= ${thirtyDaysAgo}
      GROUP BY tenantId
    `,
  ]);

  const mrr = subscriptions.reduce((sum, sub) => sum + sub.price, 0);

  const tenantsWithOverdueInvoices = await Promise.all(
    overdueByTenantRows.map(async (item) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: item.tenantId },
      });
      return {
        tenant: tenant!,
        overdueCount: Number(item.cnt),
        overdueAmount: Number(item.total),
      };
    }),
  );

  const recentIncidentMap = new Map(
    recentIncidentRows.map((r) => [r.tenantId, Number(r.cnt)]),
  );
  const recentDocumentMap = new Map(
    recentDocumentRows.map((r) => [r.tenantId, Number(r.cnt)]),
  );

  const inactiveTenants = activeTenantsList
    .map((tenant) => {
      const lastLogin = tenant.users.reduce<Date | null>((latest, ut) => {
        const login = ut.user.lastLoginAttempt;
        if (!login) return latest;
        return !latest || login > latest ? login : latest;
      }, null);

      const daysSinceLogin = lastLogin
        ? Math.floor(
            (new Date().getTime() - new Date(lastLogin).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

      const activity =
        (recentIncidentMap.get(tenant.id) || 0) +
        (recentDocumentMap.get(tenant.id) || 0);

      return {
        id: tenant.id,
        name: tenant.name,
        userCount: tenant._count.users,
        subscription: tenant.subscription?.plan || null,
        daysSinceLogin,
        recentActivity: activity,
        lastLoginText: lastLogin
          ? daysSinceLogin > 60
            ? `${Math.floor(daysSinceLogin / 30)} mnd siden`
            : `${daysSinceLogin} dager siden`
          : "Aldri logget inn",
      };
    })
    .filter((t) => t.daysSinceLogin > 30)
    .sort((a, b) => b.daysSinceLogin - a.daysSinceLogin)
    .slice(0, 8);

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
    invoicesNeedingAttention,
    inactiveTenants,
  };
}
