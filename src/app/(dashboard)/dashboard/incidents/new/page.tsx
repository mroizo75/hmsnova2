import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IncidentForm } from "@/features/incidents/components/incident-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { IncidentType } from "@prisma/client";
import { hasTenantFeature } from "@/lib/tenant-features";
import { getTranslations } from "next-intl/server";

type PageSearchParams =
  | Promise<{
      type?: IncidentType;
      projectId?: string;
      tablet?: string;
      template?: "homeVisitRisk" | "violenceThreat" | "infectionExposure";
    }>
  | {
      type?: IncidentType;
      projectId?: string;
      tablet?: string;
      template?: "homeVisitRisk" | "violenceThreat" | "infectionExposure";
    }
  | undefined;

export default async function NewIncidentPage({ searchParams }: { searchParams?: PageSearchParams }) {
  const t = await getTranslations("dashboardIncidentNewPage");
  const resolvedSearchParams =
    typeof searchParams === "object" && searchParams !== null && "then" in searchParams
      ? await searchParams
    : (searchParams as {
        type?: IncidentType;
        projectId?: string;
        tablet?: string;
        template?: "homeVisitRisk" | "violenceThreat" | "infectionExposure";
      } | undefined);
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: {
            select: {
              industry: true,
              ruhModuleEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("errors.noTenantAccess")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("errors.noTenantAccess")}</div>;
  }

  const tenantId = selectedMembership.tenantId;
  const isHealthcareTenant = hasTenantFeature(
    selectedMembership.tenant?.industry,
    "helseforetak",
  );
  const isTabletMode = resolvedSearchParams?.tablet === "1" && isHealthcareTenant;

  const [risks, users, projects] = await Promise.all([
    prisma.risk.findMany({
      where: { tenantId },
      select: { id: true, title: true, category: true, score: true },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 25,
    }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.project.findMany({
      where: { tenantId, status: { in: ["PLANNING", "ACTIVE"] } },
      select: { id: true, name: true, code: true, status: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userList = users
    .map((ut) => ut.user)
    .filter((u) => u.id !== user.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.backToIncidents")}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
        {isTabletMode && (
          <p className="mt-2 text-sm font-medium text-blue-700">
            {t("tabletModeActive")}
          </p>
        )}
      </div>

      <IncidentForm
        tenantId={tenantId}
        userId={user.id}
        risks={risks}
        users={userList}
        projects={projects}
        defaultType={resolvedSearchParams?.type}
        defaultProjectId={resolvedSearchParams?.projectId}
        isTabletMode={isTabletMode}
        templatePreset={resolvedSearchParams?.template}
        ruhModuleEnabled={selectedMembership.tenant.ruhModuleEnabled}
      />
    </div>
  );
}

