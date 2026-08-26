import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { fetchAnnualHmsPlanReport } from "@/server/queries/annual-hms-plan.queries";
import { AnnualHmsPlanReportContent } from "@/features/annual-hms-plan/components/annual-hms-plan-report-content";

interface AnnualHmsPlanReportPageProps {
  searchParams: {
    year?: string;
  };
}

export default async function AnnualHmsPlanReportPage({ searchParams }: AnnualHmsPlanReportPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId || !session.user.role) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadManagementReviews && !permissions.canReadDocuments) {
    redirect("/dashboard");
  }

  const now = new Date();
  const yearParam = Number.parseInt(searchParams.year ?? "", 10);
  const year = Number.isFinite(yearParam) && yearParam >= 2020 && yearParam <= now.getFullYear() + 1 ? yearParam : now.getFullYear();

  const initialData = await fetchAnnualHmsPlanReport(year);

  if (!initialData) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">Årlig HMS-plan – rapport</h1>
        <p className="text-sm text-muted-foreground">Kunne ikke hente sjekkliste for valgt år.</p>
      </div>
    );
  }

  const generatedAt = now.toLocaleString("nb-NO");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 bg-background text-foreground">
      <AnnualHmsPlanReportContent
        initialData={initialData}
        year={year}
        generatedAt={generatedAt}
      />
    </div>
  );
}
