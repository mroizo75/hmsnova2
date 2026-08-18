import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Plus, CheckCircle2, Circle, AlertTriangle } from "lucide-react";

function getActivityLevel(
  lastLogin: Date | null,
  recentIncidents: number,
  recentDocuments: number,
) {
  const now = new Date();
  const daysSinceLogin = lastLogin
    ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const totalActivity = recentIncidents + recentDocuments;

  if (daysSinceLogin <= 7 && totalActivity >= 3) {
    return { level: "high", label: "Aktiv", color: "text-green-600", bg: "bg-green-600" };
  }
  if (daysSinceLogin <= 14 && totalActivity >= 1) {
    return { level: "medium", label: "Moderat", color: "text-yellow-600", bg: "bg-yellow-500" };
  }
  if (daysSinceLogin <= 30) {
    return { level: "low", label: "Lav aktivitet", color: "text-orange-500", bg: "bg-orange-500" };
  }
  return { level: "inactive", label: "Inaktiv", color: "text-destructive", bg: "bg-destructive" };
}

export default async function TenantsPage() {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isSuperAdmin: true },
      })
    : null;
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tenants = await prisma.tenant.findMany({
    where: {
      users: {
        some: {},
      },
    },
    include: {
      subscription: true,
      offers: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      invoices: {
        where: {
          status: "OVERDUE",
        },
      },
      users: {
        include: {
          user: {
            select: {
              lastLoginAttempt: true,
            },
          },
        },
      },
      _count: {
        select: {
          users: true,
          incidents: true,
          documents: true,
          risks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const [recentIncidentRows, recentDocumentRows] = await Promise.all([
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

  const recentIncidentMap = new Map(
    recentIncidentRows.map((r) => [r.tenantId, Number(r.cnt)]),
  );
  const recentDocumentMap = new Map(
    recentDocumentRows.map((r) => [r.tenantId, Number(r.cnt)]),
  );

  const enrichedTenants = tenants.map((tenant) => {
    const lastLogin = tenant.users.reduce<Date | null>((latest, ut) => {
      const login = ut.user.lastLoginAttempt;
      if (!login) return latest;
      return !latest || login > latest ? login : latest;
    }, null);

    const recentIncidents = recentIncidentMap.get(tenant.id) || 0;
    const recentDocuments = recentDocumentMap.get(tenant.id) || 0;
    const activity = getActivityLevel(lastLogin, recentIncidents, recentDocuments);

    return {
      ...tenant,
      lastLogin,
      recentIncidents,
      recentDocuments,
      activity,
    };
  });

  const activeCount = enrichedTenants.filter((t) => t.status === "ACTIVE").length;
  const trialCount = enrichedTenants.filter((t) => t.status === "TRIAL").length;
  const inactiveCount = enrichedTenants.filter(
    (t) => t.activity.level === "inactive" && t.status === "ACTIVE",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bedrifter</h1>
          <p className="text-muted-foreground">
            {enrichedTenants.length} bedrifter • {activeCount} aktive • {trialCount} prøve
            {inactiveCount > 0 && (
              <span className="text-destructive font-medium">
                {" "}• {inactiveCount} inaktive
              </span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Ny bedrift
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle bedrifter ({enrichedTenants.length})</CardTitle>
          <CardDescription>
            Klikk på en bedrift for å se detaljer. Aktivitet er basert på siste 30 dager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bedrift</TableHead>
                  <TableHead>Status</TableHead>
                  {isSuperAdmin && <TableHead>Avtale</TableHead>}
                  {isSuperAdmin && <TableHead>Abonnement</TableHead>}
                  {isSuperAdmin && <TableHead className="text-center">Brukere</TableHead>}
                  {isSuperAdmin && <TableHead>Siste innlogging</TableHead>}
                  <TableHead className="text-center">Aktivitet (30d)</TableHead>
                  <TableHead>Engasjement</TableHead>
                  {isSuperAdmin && <TableHead>Faktura</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="block -m-4 p-4"
                      >
                        <p className="font-medium hover:underline">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.orgNumber || tenant.slug}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tenant.status === "ACTIVE"
                            ? "default"
                            : tenant.status === "TRIAL"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {(() => {
                          const latestOffer = tenant.offers[0];
                          const isAccepted =
                            latestOffer?.status === "ACCEPTED" ||
                            (tenant.status === "ACTIVE" && !latestOffer);
                          if (isAccepted) {
                            return (
                              <Badge
                                variant="default"
                                className="flex w-fit items-center gap-1 bg-green-600 hover:bg-green-600"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Godkjent
                              </Badge>
                            );
                          }
                          if (latestOffer?.status === "SENT") {
                            return <Badge variant="secondary">Sendt</Badge>;
                          }
                          return <span className="text-sm text-muted-foreground">-</span>;
                        })()}
                      </TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell>
                        {tenant.subscription ? (
                          <div>
                            <p className="text-sm font-medium">
                              {tenant.subscription.plan}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tenant.subscription.price} kr/
                              {tenant.subscription.billingInterval === "MONTHLY"
                                ? "mnd"
                                : "år"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell className="text-center">{tenant._count.users}</TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell>
                        {tenant.lastLogin ? (
                          <div>
                            <p className="text-sm">
                              {new Date(tenant.lastLogin).toLocaleDateString("no-NO")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDaysAgo(tenant.lastLogin)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Aldri</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center justify-center gap-1.5 text-sm">
                            <span className="font-medium">
                              {tenant.recentIncidents + tenant.recentDocuments}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tenant.recentIncidents} avvik</p>
                          <p>{tenant.recentDocuments} dokumenter</p>
                          <p>{tenant._count.risks} risikoer (totalt)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Circle
                          className={`h-2.5 w-2.5 fill-current ${tenant.activity.color}`}
                        />
                        <span className={`text-xs font-medium ${tenant.activity.color}`}>
                          {tenant.activity.label}
                        </span>
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {tenant.invoices.length > 0 ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {tenant.invoices.length} forfalt
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">OK</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDaysAgo(date: Date): string {
  const days = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `${days} dager siden`;
  if (days < 30) return `${Math.floor(days / 7)} uker siden`;
  return `${Math.floor(days / 30)} mnd siden`;
}
