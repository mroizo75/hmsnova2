"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnvironmentMeasurementForm } from "@/features/environment/components/environment-measurement-form";
import { EnvironmentMeasurementList } from "@/features/environment/components/environment-measurement-list";
import { EnvironmentAspectForm } from "@/features/environment/components/environment-aspect-form";
import { fetchEnvironmentDetail } from "@/server/queries/environment.queries";

type EnvironmentDetailData = NonNullable<Awaited<ReturnType<typeof fetchEnvironmentDetail>>>;

const getSignificanceMeta = (score: number) => {
  if (score >= 20) return { label: "Kritisk", className: "bg-red-100 text-red-900 border-red-300" };
  if (score >= 12) return { label: "Høy", className: "bg-orange-100 text-orange-900 border-orange-300" };
  if (score >= 6) return { label: "Moderat", className: "bg-yellow-100 text-yellow-900 border-yellow-300" };
  return { label: "Lav", className: "bg-green-100 text-green-900 border-green-300" };
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  MONITORED: "Følges opp",
  CLOSED: "Lukket",
};

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("nb-NO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

interface EnvironmentDetailContentProps {
  initialData: EnvironmentDetailData;
  tenantId: string;
}

export function EnvironmentDetailContent({ initialData, tenantId }: EnvironmentDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["settings", "environment", initialData.aspect.id],
    queryFn: () => fetchEnvironmentDetail(initialData.aspect.id),
    initialData,
  });

  if (!data) return null;

  const { aspect, users, goals } = data;
  const significanceMeta = getSignificanceMeta(aspect.significanceScore);

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        <Badge variant="outline">{aspect.category}</Badge>
        <Badge variant="outline" className={significanceMeta.className}>
          Betydning: {aspect.significanceScore} · {significanceMeta.label}
        </Badge>
        <Badge variant="outline">{statusLabels[aspect.status] ?? aspect.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detaljer</CardTitle>
          <CardDescription>Oversikt over kontekst og ansvar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Prosess</p>
              <p className="font-medium">{aspect.process || "Ikke satt"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lokasjon</p>
              <p className="font-medium">{aspect.location || "Ikke satt"}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Ansvarlig</p>
              <p className="font-medium">
                {aspect.owner?.name || aspect.owner?.email || "Ikke satt"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Knyttet mål</p>
              <p className="font-medium">{aspect.goal?.title || "Ingen"}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Neste revisjon</p>
              <p className="font-medium">{formatDateTime(aspect.nextReviewDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Siste måledato</p>
              <p className="font-medium">{formatDateTime(aspect.lastMeasurementDate)}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Myndighetskrav</p>
              <p className="text-sm">{aspect.legalRequirement || "Ikke dokumentert"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kontrolltiltak</p>
              <p className="text-sm">{aspect.controlMeasures || "Ikke dokumentert"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Målemetode</p>
            <p className="text-sm">{aspect.monitoringMethod || "Ikke definert"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Målinger</CardTitle>
          <CardDescription>Registrer miljødata og følg status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EnvironmentMeasurementForm aspectId={aspect.id} users={users} />
          <EnvironmentMeasurementList measurements={aspect.measurements} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rediger miljøaspekt</CardTitle>
          <CardDescription>Oppdater klassifisering og ansvar</CardDescription>
        </CardHeader>
        <CardContent>
          <EnvironmentAspectForm
            tenantId={tenantId}
            users={users}
            goals={goals}
            aspect={aspect}
            mode="edit"
          />
        </CardContent>
      </Card>
    </>
  );
}
