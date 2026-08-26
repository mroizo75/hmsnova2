import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { hasTenantFeature } from "@/lib/tenant-features";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchIncidentStatistics } from "@/server/queries/incident-statistics.queries";
import { IncidentStatisticsContent } from "@/features/incidents/components/incident-statistics-content";

export default async function HseStatisticsPage() {
  const t = await getTranslations("dashboardIncidentStatisticsPage");
  const locale = await getLocale();
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
            select: { industry: true },
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

  if (!hasTenantFeature(selectedMembership.tenant?.industry, "trir")) {
    redirect("/dashboard/incidents");
  }

  const initialData = await fetchIncidentStatistics();

  return (
    <div className="space-y-6">
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
              {t("title")}
            </h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
      </div>

      <IncidentStatisticsContent initialData={initialData} locale={locale} />
    </div>
  );
}
