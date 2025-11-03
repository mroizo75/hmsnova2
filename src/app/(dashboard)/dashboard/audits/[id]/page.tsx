import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FindingForm } from "@/features/audits/components/finding-form";
import { FindingList } from "@/features/audits/components/finding-list";
import { CompleteAuditForm } from "@/features/audits/components/complete-audit-form";
import { UpdateAuditStatusForm } from "@/features/audits/components/update-audit-status-form";
import {
  getAuditTypeLabel,
  getAuditTypeColor,
  getAuditStatusLabel,
  getAuditStatusColor,
} from "@/features/audits/schemas/audit.schema";
import {
  ArrowLeft,
  Calendar,
  User,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Edit,
} from "lucide-react";
import Link from "next/link";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!currentUser || currentUser.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = currentUser.tenants[0].tenantId;

  const audit = await prisma.audit.findUnique({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!audit) {
    return <div>Revisjon ikke funnet</div>;
  }

  // Hent hovedrevisor
  const leadAuditor = await prisma.user.findUnique({
    where: { id: audit.leadAuditorId },
    select: { id: true, name: true, email: true },
  });

  // Hent revisjonsteam
  const teamMemberIds = audit.teamMemberIds ? JSON.parse(audit.teamMemberIds) : [];
  const teamMembers = await prisma.user.findMany({
    where: { id: { in: teamMemberIds } },
    select: { id: true, name: true, email: true },
  });

  // Hent alle brukere for tenant (for å kunne legge til funn)
  const tenantUsers = await prisma.user.findMany({
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
  });

  const typeLabel = getAuditTypeLabel(audit.auditType);
  const typeColor = getAuditTypeColor(audit.auditType);
  const statusLabel = getAuditStatusLabel(audit.status);
  const statusColor = getAuditStatusColor(audit.status);

  // Finding statistics
  const findingStats = {
    total: audit.findings.length,
    majorNCs: audit.findings.filter((f) => f.findingType === "MAJOR_NC").length,
    minorNCs: audit.findings.filter((f) => f.findingType === "MINOR_NC").length,
    observations: audit.findings.filter((f) => f.findingType === "OBSERVATION").length,
    strengths: audit.findings.filter((f) => f.findingType === "STRENGTH").length,
    open: audit.findings.filter((f) => f.status === "OPEN").length,
    inProgress: audit.findings.filter((f) => f.status === "IN_PROGRESS").length,
    resolved: audit.findings.filter((f) => f.status === "RESOLVED").length,
    verified: audit.findings.filter((f) => f.status === "VERIFIED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/audits">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til revisjoner
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{audit.title}</h1>
            <p className="text-muted-foreground">Revisjonsdetaljer</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={typeColor}>{typeLabel}</Badge>
            <Badge className={statusColor}>{statusLabel}</Badge>
            <UpdateAuditStatusForm auditId={audit.id} currentStatus={audit.status} />
            {audit.status !== "COMPLETED" && audit.status !== "CANCELLED" && (
              <CompleteAuditForm
                auditId={audit.id}
                currentSummary={audit.summary}
                currentConclusion={audit.conclusion}
              />
            )}
            <Link href={`/dashboard/audits/${audit.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Rediger
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Planlagt dato</p>
                <p className="font-medium">
                  {new Date(audit.scheduledDate).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {audit.completedAt && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fullført</p>
                  <p className="font-medium">
                    {new Date(audit.completedAt).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Område</p>
                <p className="font-medium">{audit.area}</p>
                {audit.department && (
                  <p className="text-sm text-muted-foreground">Avdeling: {audit.department}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle>Revisjonsteam</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hovedrevisor</p>
                <p className="font-medium">{leadAuditor?.name || "Ukjent"}</p>
                <p className="text-sm text-muted-foreground">{leadAuditor?.email}</p>
              </div>
            </div>

            {teamMembers.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revisjonsteam</p>
                  {teamMembers.map((member) => (
                    <div key={member.id}>
                      <p className="font-medium">{member.name || "Ukjent"}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scope and Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Omfang og kriterier (ISO 9001)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Omfang:</p>
            <p className="text-sm whitespace-pre-wrap">{audit.scope}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Revisjonskriterier:</p>
            <p className="text-sm whitespace-pre-wrap">{audit.criteria}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary and Conclusion */}
      {(audit.summary || audit.conclusion) && (
        <Card>
          <CardHeader>
            <CardTitle>Oppsummering og konklusjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {audit.summary && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Oppsummering:</p>
                <p className="text-sm whitespace-pre-wrap">{audit.summary}</p>
              </div>
            )}
            {audit.conclusion && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Konklusjon:</p>
                <p className="text-sm whitespace-pre-wrap">{audit.conclusion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Findings Statistics */}
      {findingStats.total > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Funn fra revisjon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-orange-900">Større avvik</p>
                <p className="text-3xl font-bold text-red-600">{findingStats.majorNCs}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Mindre avvik</p>
                <p className="text-3xl font-bold text-orange-600">{findingStats.minorNCs}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Observasjoner</p>
                <p className="text-3xl font-bold text-yellow-600">{findingStats.observations}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Styrker</p>
                <p className="text-3xl font-bold text-green-600">{findingStats.strengths}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Funn og observasjoner</CardTitle>
              <CardDescription>
                Dokumenter avvik, observasjoner og styrker fra revisjonen
              </CardDescription>
            </div>
            <FindingForm auditId={audit.id} users={tenantUsers} />
          </div>
        </CardHeader>
        <CardContent>
          <FindingList findings={audit.findings} />
        </CardContent>
      </Card>

      {/* ISO 9001 Compliance */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 ISO 9001 Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Omfang og kriterier definert</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>Hovedrevisor utnevnt (objektivitet sikret)</span>
          </div>
          <div className="flex items-center gap-2">
            {audit.completedAt ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>Revisjon {audit.completedAt ? "fullført" : "ikke fullført ennå"}</span>
          </div>
          <div className="flex items-center gap-2">
            {findingStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <span>
              {findingStats.total > 0
                ? `${findingStats.total} funn dokumentert`
                : "Ingen funn dokumentert"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {findingStats.open === 0 && findingStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            ) : findingStats.open > 0 ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
            <span>
              {findingStats.open > 0
                ? `${findingStats.open} åpne funn (krever korrigerende tiltak)`
                : "Alle funn er lukket"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

