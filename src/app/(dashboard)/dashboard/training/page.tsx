import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TrainingHeaderActions } from "@/features/training/components/training-header-actions";
import { IsoCompetenceInfo } from "@/features/training/components/iso-competence-info";
import { GraduationCap } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { fetchTrainingList } from "@/server/queries/training.queries";
import { TrainingContent } from "@/features/training/components/training-content";
import { ensureHospitalityCourses } from "@/server/hospitality-courses";
import { hospitalityCourseKeysForTheme } from "@/lib/hospitality-courses";

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const t = await getTranslations("dashboardTrainingPage");
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
            },
          },
        },
      },
    },
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
  const { tema } = await searchParams;

  await ensureHospitalityCourses(tenantId);
  const initialData = await fetchTrainingList();

  const tenantUsers = initialData.tenantUsers;
  const themeKeys = hospitalityCourseKeysForTheme(tema);
  const courseTemplates = themeKeys
    ? initialData.courseTemplates.filter((row: { courseKey: string }) => themeKeys.includes(row.courseKey))
    : initialData.courseTemplates;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.training} />
        </div>
        <TrainingHeaderActions
          tenantId={tenantId}
          users={tenantUsers}
          courseTemplates={courseTemplates}
        />
      </div>

      <TrainingContent initialData={initialData} tema={tema} />

      {/* ISO 9001 – kollapset som standard */}
      <IsoCompetenceInfo />
    </div>
  );
}
