import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RiskForm } from "@/features/risks/components/risk-form";
import { MeasureForm } from "@/features/measures/components/measure-form";
import { MeasureList } from "@/features/measures/components/measure-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RiskControlForm } from "@/features/risks/components/risk-control-form";
import { RiskControlList } from "@/features/risks/components/risk-control-list";
import { RiskDocumentLinks } from "@/features/risks/components/risk-document-links";
import { RiskAuditLinks } from "@/features/risks/components/risk-audit-links";
import { getTranslations } from "next-intl/server";

export default async function EditRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("dashboardRiskDetailPage");
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
    return <div>{t("noTenantAccess")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const tenantId = selectedMembership.tenantId;

  const risk = await prisma.risk.findUnique({
    where: { id, tenantId },
    include: {
      measures: {
        orderBy: { createdAt: "desc" },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
      kpi: {
        select: { id: true, title: true },
      },
      inspectionTemplate: {
        select: { id: true, name: true },
      },
      controls: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          evidenceDocument: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      documentLinks: {
        include: {
          document: { select: { id: true, title: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      auditLinks: {
        include: {
          audit: { select: { id: true, title: true, scheduledDate: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!risk) {
    return <div>{t("notFound")}</div>;
  }

  // Hent alle brukere for tenant (for ansvarlig person)
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

  const goals = await prisma.goal.findMany({
    where: { tenantId },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const inspectionTemplates = await prisma.inspectionTemplate.findMany({
    where: {
      OR: [
        { tenantId },
        { tenantId: null, isGlobal: true },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const documents = await prisma.document.findMany({
    where: { tenantId },
    select: { id: true, title: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const audits = await prisma.audit.findMany({
    where: { tenantId },
    select: { id: true, title: true, scheduledDate: true, status: true },
    orderBy: { scheduledDate: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/risks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.back")}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{risk.title}</p>
      </div>

      <RiskForm
        tenantId={tenantId}
        userId={user.id}
        risk={risk}
        mode="edit"
        owners={tenantUsers}
        goalOptions={goals}
        templateOptions={inspectionTemplates}
        slotBetweenRisikonivaAndResidual={
          <Card id="tiltak">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("measures.title")}</CardTitle>
                  <CardDescription>
                    {t("measures.description")}
                  </CardDescription>
                </div>
                <MeasureForm tenantId={tenantId} riskId={risk.id} users={tenantUsers} />
              </div>
            </CardHeader>
            <CardContent>
              <MeasureList measures={risk.measures} />
            </CardContent>
          </Card>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("controls.title")}</CardTitle>
              <CardDescription>{t("controls.description")}</CardDescription>
            </div>
            <RiskControlForm riskId={risk.id} users={tenantUsers} documents={documents} />
          </div>
        </CardHeader>
        <CardContent>
          <RiskControlList riskId={risk.id} controls={risk.controls} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("documents.title")}</CardTitle>
          <CardDescription>{t("documents.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskDocumentLinks riskId={risk.id} documents={documents} links={risk.documentLinks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("audits.title")}</CardTitle>
          <CardDescription>{t("audits.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskAuditLinks riskId={risk.id} audits={audits} links={risk.auditLinks} />
        </CardContent>
      </Card>
    </div>
  );
}

