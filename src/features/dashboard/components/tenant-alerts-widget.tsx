import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react";
import type { TenantAlert } from "@/lib/tenant-alerts";

interface TenantAlertsWidgetProps {
  alerts: TenantAlert[];
}

/**
 * Systematisk HMS-varsling for tenanten (IK-HMS § 5) - komplementerer det
 * personlige oppgavesenteret med tverrgående etterlevelsesvarsler.
 */
export function TenantAlertsWidget({ alerts }: TenantAlertsWidgetProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <ShieldCheck className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="font-medium">Ingen systematiske HMS-varsler</p>
            <p className="text-sm text-muted-foreground">
              Alt ser bra ut - ingen forfalte tiltak, ubesatte roller eller utløpte frister.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-amber-600" />
              HMS-varsler
            </CardTitle>
            <CardDescription className="text-xs">
              Systematisk oppfølging jf. IK-HMS § 5
            </CardDescription>
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalCount} kritiske
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        {alerts.map((alert) => (
          <Link key={alert.id} href={alert.href}>
            <div className="flex items-center gap-3 py-2 px-2.5 rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                  alert.severity === "critical"
                    ? "text-red-600 bg-red-50"
                    : "text-amber-600 bg-amber-50"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{alert.title}</p>
                <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
