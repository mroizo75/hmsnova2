import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnvironmentMeasurementForm } from "@/features/environment/components/environment-measurement-form";
import { EnvironmentMeasurementList } from "@/features/environment/components/environment-measurement-list";
import { EnvironmentAspectForm } from "@/features/environment/components/environment-aspect-form";

const getSignificanceMeta = (score: number) => {
  if (score >= 20) return { label: "Kritisk", className: "bg-red-100 text-red-900 border-red-300" };
  if (score >= 12) return { label: "Høy", className: "bg-orange-100 text-orange-900 border-orange-300" };
  if (score >= 6) return { label: "Moderat", className: "bg-yellow-100 text-yellow-900 border-yellow-300" };
  return { label: "Lav", className: "bg-green-100 text-green-900 border-green-300" };
};

const statusLabels = {
  ACTIVE: "Aktiv",
  MONITORED: "Følges opp",
  CLOSED: "Lukket",
};

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default async function EnvironmentAspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = selectedMembership.tenantId;

  const aspect = await prisma.environmentalAspect.findUnique({
    where: { id, tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      goal: { select: { id: true, title: true } },
      measurements: {
        orderBy: { measurementDate: "desc" },
        include: {
          responsible: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!aspect) {
    return <div>Miljøaspekt ikke funnet</div>;
  }

  const [users, goals] = await Promise.all([
    prisma.user.findMany({
      where: {
        tenants: {
          some: { tenantId },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.goal.findMany({
      where: { tenantId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const significanceMeta = getSignificanceMeta(aspect.significanceScore);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/environment">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">ISO 14001</p>
            <h1 className="text-3xl font-bold">{aspect.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{aspect.category}</Badge>
              <Badge variant="outline" className={significanceMeta.className}>
                Betydning: {aspect.significanceScore} · {significanceMeta.label}
              </Badge>
              <Badge variant="outline">{statusLabels[aspect.status]}</Badge>
            </div>
          </div>
        </div>
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
              <p className="text-sm">
                {aspect.legalRequirement || "Ikke dokumentert"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kontrolltiltak</p>
              <p className="text-sm">
                {aspect.controlMeasures || "Ikke dokumentert"}
              </p>
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
    </div>
  );
}

