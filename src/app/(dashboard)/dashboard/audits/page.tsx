import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditList } from "@/features/audits/components/audit-list";
import {
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export default async function AuditsPage() {
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

  // Hent alle revisjoner med funn
  const audits = await prisma.audit.findMany({
    where: { tenantId },
    include: {
      findings: true,
    },
    orderBy: { scheduledDate: "desc" },
  });

  // Calculate statistics
  const stats = {
    total: audits.length,
    planned: audits.filter((a) => a.status === "PLANNED").length,
    inProgress: audits.filter((a) => a.status === "IN_PROGRESS").length,
    completed: audits.filter((a) => a.status === "COMPLETED").length,
    totalFindings: audits.reduce((sum, a) => sum + a.findings.length, 0),
    majorNCs: audits.reduce(
      (sum, a) => sum + a.findings.filter((f) => f.findingType === "MAJOR_NC").length,
      0
    ),
    minorNCs: audits.reduce(
      (sum, a) => sum + a.findings.filter((f) => f.findingType === "MINOR_NC").length,
      0
    ),
    openFindings: audits.reduce(
      (sum, a) =>
        sum + a.findings.filter((f) => f.status !== "VERIFIED").length,
      0
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Revisjoner
          </h1>
          <p className="text-muted-foreground">
            ISO 9001 - 9.2: Planlegg og gjennomfør interne revisjoner
          </p>
        </div>
        <Link href="/dashboard/audits/new">
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Planlegg revisjon
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Revisjoner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planlagt</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
            <p className="text-xs text-muted-foreground">Kommende</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pågår</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Under gjennomføring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fullført</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? `${Math.round((stats.completed / stats.total) * 100)}% av totalt`
                : "0% av totalt"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Åpne funn</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.openFindings}</div>
            <p className="text-xs text-muted-foreground">Må lukkes</p>
          </CardContent>
        </Card>
      </div>

      {/* Findings summary */}
      {stats.totalFindings > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Funn fra revisjoner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-orange-900">Større avvik (Major NC)</p>
                <p className="text-3xl font-bold text-red-600">{stats.majorNCs}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Mindre avvik (Minor NC)</p>
                <p className="text-3xl font-bold text-orange-600">{stats.minorNCs}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Totalt funn</p>
                <p className="text-3xl font-bold text-orange-900">{stats.totalFindings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ISO 9001 Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 ISO 9001 - 9.2 Internrevisjon</CardTitle>
          <CardDescription className="text-blue-800">
            Krav til internrevisjon
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-1">a) Samsvar med egne krav:</p>
              <p>Verifiser at ledelsessystemet følger organisasjonens egne krav</p>
            </div>
            <div>
              <p className="font-semibold mb-1">b) Samsvar med ISO 9001:</p>
              <p>Sjekk at kravene i standarden er oppfylt</p>
            </div>
            <div>
              <p className="font-semibold mb-1">c) Effektivt implementert:</p>
              <p>Vurder om systemet er virksomt og vedlikeholdt</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Revisjonsprogram:</p>
              <p>Planlegg revisjoner med jevne intervaller</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Objektive revisorer:</p>
              <p>Velg upartiske revisorer (ikke revidere eget arbeid)</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Korrigerende tiltak:</p>
              <p>Ta tiltak uten unødig forsinkelse ved avvik</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle revisjoner</CardTitle>
          <CardDescription>
            Oversikt over planlagte, pågående og fullførte revisjoner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditList audits={audits} />
        </CardContent>
      </Card>
    </div>
  );
}
