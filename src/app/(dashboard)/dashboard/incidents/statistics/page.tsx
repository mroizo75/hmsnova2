import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { HseStatisticsTable } from "@/features/incidents/components/hse-statistics-table";

export default async function HseStatisticsPage() {
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

  const tenantId = user.tenants[0].tenantId;
  const currentYear = new Date().getFullYear();

  // Hent data for inneværende år + 2 forrige (3 år totalt)
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const yearData = await Promise.all(
    years.map(async (year) => {
      const from = new Date(`${year}-01-01T00:00:00.000Z`);
      const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

      const [incidents, timeEntries] = await Promise.all([
        prisma.incident.findMany({
          where: {
            tenantId,
            occurredAt: { gte: from, lt: to },
            type: { in: ["ULYKKE", "NESTEN", "YRKESSYKDOM"] },
          },
          select: {
            isFatal: true,
            isLostTimeIncident: true,
            lostWorkdays: true,
            isRestrictedWork: true,
            medicalAttentionRequired: true,
          },
        }),
        prisma.timeEntry.findMany({
          where: { tenantId, date: { gte: from, lt: to } },
          select: { hours: true },
        }),
      ]);

      const manHours = timeEntries.reduce((s, e) => s + e.hours, 0);
      const fatalities = incidents.filter((i) => i.isFatal).length;
      const lti = incidents.filter((i) => i.isLostTimeIncident).length;
      const lostWorkdays = incidents.reduce((s, i) => s + (i.lostWorkdays ?? 0), 0);
      const restricted = incidents.filter((i) => i.isRestrictedWork).length;
      const medical = incidents.filter((i) => i.medicalAttentionRequired).length;
      const totalRecordable = fatalities + lti + restricted + medical;
      const trir =
        manHours > 0
          ? Math.round(((totalRecordable * 200000) / manHours) * 100) / 100
          : null;

      return {
        year,
        manHours: Math.round(manHours * 10) / 10,
        fatalities,
        lostTimeIncidents: lti,
        lostWorkdays,
        restrictedWorkCases: restricted,
        medicalTreatmentCases: medical,
        totalRecordable,
        trir,
      };
    })
  );

  const hasTimeRegistration = yearData.some((y) => y.manHours > 0);
  const ytd = yearData[yearData.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/incidents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              HSE-statistikk
            </h1>
            <p className="text-muted-foreground">
              TRIR · Fraværsskader · Skadefrekvens – 3-årshistorikk
            </p>
          </div>
        </div>
      </div>

      {/* Varsel om manntimer */}
      {!hasTimeRegistration && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Manntimer ikke registrert</p>
            <p className="mt-0.5">
              TRIR krever arbeidede timer. Aktiver{" "}
              <Link href="/dashboard/time-registration" className="underline font-medium">
                timeregistrering
              </Link>{" "}
              eller legg inn timer manuelt for å beregne TRIR korrekt.
            </p>
          </div>
        </div>
      )}

      {/* YTD-kort øverst */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Hittil i år ({ytd.year})
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="TRIR"
            value={ytd.trir !== null ? ytd.trir.toString() : "—"}
            sub="Total Recordable Injury Rate"
            highlight={ytd.trir !== null && ytd.trir > 5 ? "red" : ytd.trir !== null ? "green" : "gray"}
          />
          <StatCard
            label="Fraværsskader (LTI)"
            value={ytd.lostTimeIncidents.toString()}
            sub={`${ytd.lostWorkdays} tapte arbeidsdager`}
            highlight={ytd.lostTimeIncidents > 0 ? "red" : "green"}
          />
          <StatCard
            label="Arbeidede timer"
            value={ytd.manHours > 0 ? ytd.manHours.toLocaleString("nb-NO") : "—"}
            sub="Fra timeregistrering"
            highlight="gray"
          />
          <StatCard
            label="Recordable hendelser"
            value={ytd.totalRecordable.toString()}
            sub="Fatality + LTI + RW + MT"
            highlight={ytd.totalRecordable > 0 ? "amber" : "green"}
          />
        </div>
      </div>

      {/* 3-årshistorikk tabell */}
      <Card>
        <CardHeader>
          <CardTitle>3-årshistorikk</CardTitle>
          <CardDescription>
            Standardformat for HSE-rapportering til kunder og oppdragsgivere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HseStatisticsTable data={yearData} />
        </CardContent>
      </Card>

      {/* TRIR-forklaring */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Hva betyr TRIR?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-3">
          <p>
            <strong>Total Recordable Injury Rate (TRIR)</strong> måler alle
            registrerbare skader per 200 000 arbeidede timer (tilsvarer 100
            fulltidsansatte i ett år).
          </p>
          <div className="rounded-md bg-blue-100 border border-blue-200 px-4 py-3 font-mono text-xs">
            TRIR = (Fatalities + LTI + Restricted Work + Medical Treatment) × 200 000 / Arbeidede timer
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold mb-1">Hendelsestyper i telleren:</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-800">
                <li><strong>Fatalities</strong> – Dødsfall</li>
                <li><strong>LTI</strong> – Lost Time Incident (fraværsskade)</li>
                <li><strong>Restricted Work</strong> – Begrenset arbeid</li>
                <li><strong>Medical Treatment</strong> – Legebehandling</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">Typiske bransjemål:</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-800">
                <li>TRIR &lt; 1.0 – Excellent (offshore-standard)</li>
                <li>TRIR &lt; 3.0 – Godt (industri)</li>
                <li>TRIR &lt; 5.0 – Akseptabelt (bygg)</li>
                <li>TRIR &gt; 5.0 – Krever tiltak</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight: "red" | "green" | "amber" | "gray";
}) {
  const colors = {
    red: "border-red-200 bg-red-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    gray: "bg-card",
  };
  const valueColors = {
    red: "text-red-700",
    green: "text-green-700",
    amber: "text-amber-700",
    gray: "text-foreground",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[highlight]}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold ${valueColors[highlight]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
