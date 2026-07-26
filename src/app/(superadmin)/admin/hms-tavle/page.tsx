import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Monitor, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { HmsTavleSubscriptionStatus } from "@prisma/client";
import { PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { SuperadminTavleActions } from "./superadmin-tavle-actions";

function statusBadge(status: HmsTavleSubscriptionStatus) {
  const config: Record<
    HmsTavleSubscriptionStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    TRIAL: { label: "Prøve", variant: "secondary" },
    ACTIVE: { label: "Aktiv", variant: "default" },
    EXPIRING_SOON: { label: "Utløper snart", variant: "outline" },
    EXPIRED: { label: "Utløpt", variant: "destructive" },
    CANCELLED: { label: "Kansellert", variant: "destructive" },
  };
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function daysUntil(date: Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function SuperadminHmsTavlePage() {
  const subscriptions = await prisma.hmsTavleSubscription.findMany({
    include: {
      tenant: {
        select: {
          name: true,
          contactEmail: true,
          orgNumber: true,
          isTavleOnly: true,
          _count: { select: { hmsTavler: true } },
        },
      },
    },
    orderBy: { endsAt: "asc" },
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "ACTIVE").length,
    expiringSoon: subscriptions.filter((s) => {
      const days = daysUntil(s.endsAt);
      return days <= 30 && days > 0 && s.status === "ACTIVE";
    }).length,
    expired: subscriptions.filter((s) => s.status === "EXPIRED").length,
    monthlyRevenue: subscriptions
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + (s.pricePerMonth ?? 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Monitor className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">HMS Tavle – Abonnementer</h1>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Totalt", value: stats.total },
          { label: "Aktive", value: stats.active },
          { label: "Utløper snart", value: stats.expiringSoon },
          { label: "Utløpt", value: stats.expired },
          { label: "MRR (kr/mnd)", value: `${stats.monthlyRevenue.toLocaleString("nb-NO")}` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabell */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alle HMS Tavle-abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bedrift</TableHead>
                <TableHead>Org.nr</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utløper</TableHead>
                <TableHead>Tavler</TableHead>
                <TableHead>Kr/mnd</TableHead>
                <TableHead>Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => {
                const days = daysUntil(sub.endsAt);
                const isExpiringSoon = days <= 30 && days > 0 && sub.status === "ACTIVE";

                return (
                  <TableRow key={sub.id} className={sub.status === "EXPIRED" ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{sub.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{sub.tenant.contactEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sub.tenant.orgNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sub.isAddon ? "Add-on" : "Standalone"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{PLAN_LABELS[sub.plan]}</TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className={`text-sm ${isExpiringSoon ? "text-orange-600 font-medium" : ""}`}>
                          {new Date(sub.endsAt).toLocaleDateString("nb-NO")}
                        </p>
                        {isExpiringSoon && (
                          <p className="text-xs text-orange-600">{days} dager igjen</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{sub.tenant._count.hmsTavler}</TableCell>
                    <TableCell className="font-medium">kr {sub.pricePerMonth}</TableCell>
                    <TableCell>
                      <SuperadminTavleActions
                        subscription={JSON.parse(JSON.stringify({
                          id: sub.id,
                          tenantId: sub.tenantId,
                          status: sub.status,
                          plan: sub.plan,
                          endsAt: sub.endsAt,
                          isStandalone: sub.tenant.isTavleOnly,
                        }))}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {subscriptions.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Ingen HMS Tavle-abonnement registrert ennå.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
