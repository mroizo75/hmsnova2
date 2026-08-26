import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getPermissions } from "@/lib/permissions";
import { AiRiskSuggestionsCard } from "@/features/risks/components/ai-risk-suggestions-card";
import { RisksContent } from "@/features/risks/components/risks-content";
import { getTranslations } from "next-intl/server";
import { fetchRisks, fetchRiskAssessments } from "@/server/queries/risk.queries";

export default async function RisksPage() {
  const t = await getTranslations("dashboardRisksPage");
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

  const tenantRole = selectedMembership.role;
  const permissions = getPermissions(tenantRole);
  const canUseAiSuggestions = permissions.canCreateRisks;
  const canDeleteRiskAssessments = permissions.canDeleteRisks;

  const [initialRisks, initialAssessments] = await Promise.all([
    fetchRisks(),
    fetchRiskAssessments(),
  ]);

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
          <PageHelpDialog content={helpContent.risks} />
        </div>
        <Button asChild>
          <Link href="/dashboard/risks/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newRisk")}
          </Link>
        </Button>
      </div>

      {canUseAiSuggestions && <AiRiskSuggestionsCard />}

      <RisksContent
        initialRisks={initialRisks}
        initialAssessments={initialAssessments}
        canDeleteRiskAssessments={canDeleteRiskAssessments}
      />
    </div>
  );
}
