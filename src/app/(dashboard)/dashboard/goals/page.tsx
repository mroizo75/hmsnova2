import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Plus } from "lucide-react";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { fetchGoals } from "@/server/queries/goal.queries";
import { GoalsContent } from "@/features/goals/components/goals-content";

export default async function GoalsPage() {
  const t = await getTranslations("dashboardGoalsPage");
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const initialData = await fetchGoals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.goals} />
        </div>
        <Link href="/dashboard/goals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newGoal")}
          </Button>
        </Link>
      </div>

      {/* ISO 9001 Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">
                {t("iso.title")}
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>{t("iso.points.p1")}</li>
                <li>{t("iso.points.p2")}</li>
                <li>{t("iso.points.p3")}</li>
                <li>{t("iso.points.p4")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <GoalsContent initialData={initialData} />
    </div>
  );
}
