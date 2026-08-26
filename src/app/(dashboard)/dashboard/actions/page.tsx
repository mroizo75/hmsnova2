import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MeasureForm } from "@/features/measures/components/measure-form";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { MeasuresContent } from "@/features/measures/components/measures-content";
import { fetchMeasures } from "@/server/queries/measure.queries";

interface ActionsPageProps {
  searchParams: Promise<{ projectId?: string; source?: string }>;
}

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const t = await getTranslations("dashboardActionsPage");
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
  const { projectId, source } = await searchParams;
  const selectedProject = projectId
    ? await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
        },
      })
    : null;

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

  const initialData = await fetchMeasures(source);

  if (!initialData) {
    return <div>{t("noTenantAccess")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.actions} />
        </div>
        <MeasureForm tenantId={tenantId} projectId={selectedProject?.id} users={tenantUsers} />
      </div>
      {selectedProject ? (
        <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          {t("projectInfo")} <strong>{selectedProject.name}</strong>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[
          { key: undefined, label: "Alle" },
          { key: "risk", label: "Risiko" },
          { key: "incident", label: "Avvik" },
          { key: "audit", label: "Revisjon" },
          { key: "inspection", label: "Inspeksjon" },
          { key: "meeting", label: "AMU" },
          { key: "goal", label: "Mål" },
        ].map((f) => {
          const isActive = (source ?? undefined) === f.key;
          const href = f.key ? `/dashboard/actions?source=${f.key}` : "/dashboard/actions";
          return (
            <Link key={f.label} href={href}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
              >
                {f.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <MeasuresContent initialData={initialData} source={source} />

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">{t("iso.title")}</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">{t("iso.planningTitle")}</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t("iso.planningList.i1")}</li>
              <li>{t("iso.planningList.i2")}</li>
              <li>{t("iso.planningList.i3")}</li>
              <li>{t("iso.planningList.i4")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t("iso.followUpTitle")}</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t("iso.followUpList.i1")}</li>
              <li>{t("iso.followUpList.i2")}</li>
              <li>{t("iso.followUpList.i3")}</li>
              <li>{t("iso.followUpList.i4")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
