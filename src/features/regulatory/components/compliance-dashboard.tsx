"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Building2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type RequirementStatus = {
  id: string;
  title: string;
  description: string;
  legalBasis: string;
  sourceUrl: string | null;
  hmsNovaFeature: string | null;
  hmsNovaRoute: string | null;
  severity: string;
  status: "COMPLIANT" | "PARTIAL" | "MISSING";
};

type ComplianceDashboardProps = {
  tenant: {
    name: string | null;
    orgNumber: string | null;
    naceCode: string | null;
    naceDescription: string | null;
    industry: string | null;
  } | null;
  requirements: RequirementStatus[];
  compliancePercentage: number;
  onEditProfile: () => void;
};

export function ComplianceDashboard({
  tenant,
  requirements,
  compliancePercentage,
  onEditProfile,
}: ComplianceDashboardProps) {
  const mandatory = requirements.filter((r) => r.severity === "MANDATORY");
  const recommended = requirements.filter((r) => r.severity === "RECOMMENDED");

  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "PARTIAL":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Oppfylt</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Delvis</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Mangler</Badge>;
    }
  };

  const progressColor = compliancePercentage >= 80
    ? "bg-green-600"
    : compliancePercentage >= 50
      ? "bg-yellow-600"
      : "bg-red-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mitt Regelverk</h1>
          <p className="text-muted-foreground">
            Oversikt over lovkrav og samsvarsstatus for din virksomhet
          </p>
        </div>
        <Button variant="outline" onClick={onEditProfile}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Oppdater profil
        </Button>
      </div>

      {/* Compliance score + tenant info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Samsvarsgrad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold">{compliancePercentage}%</span>
              <span className="mb-1 text-muted-foreground">oppfylt</span>
            </div>
            <Progress value={compliancePercentage} className={`h-3 [&>div]:${progressColor}`} />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                {requirements.filter((r) => r.status === "COMPLIANT").length} oppfylt
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                {requirements.filter((r) => r.status === "PARTIAL").length} delvis
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-600" />
                {requirements.filter((r) => r.status === "MISSING").length} mangler
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Virksomhet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Navn</dt>
              <dd className="font-medium">{tenant?.name || "—"}</dd>
              <dt className="text-muted-foreground">Org.nr.</dt>
              <dd className="font-medium">{tenant?.orgNumber || "—"}</dd>
              <dt className="text-muted-foreground">NACE-kode</dt>
              <dd className="font-medium">{tenant?.naceCode || "—"}</dd>
              <dt className="text-muted-foreground">Bransje</dt>
              <dd className="font-medium">{tenant?.naceDescription || tenant?.industry || "—"}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Mandatory requirements */}
      {mandatory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lovpålagte krav ({mandatory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mandatory.map((req) => (
                <RequirementRow key={req.id} req={req} statusIcon={statusIcon} statusBadge={statusBadge} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended requirements */}
      {recommended.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anbefalte krav ({recommended.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommended.map((req) => (
                <RequirementRow key={req.id} req={req} statusIcon={statusIcon} statusBadge={statusBadge} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RequirementRow({
  req,
  statusIcon,
  statusBadge,
}: {
  req: RequirementStatus;
  statusIcon: (status: string) => React.ReactNode;
  statusBadge: (status: string) => React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      {statusIcon(req.status)}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{req.title}</p>
          {statusBadge(req.status)}
        </div>
        <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {req.hmsNovaRoute && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={req.hmsNovaRoute}>
              Åpne
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
