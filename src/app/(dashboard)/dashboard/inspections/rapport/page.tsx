import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, XCircle } from "lucide-react";
import { PeriodSelector } from "@/components/inspections/period-selector";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchInspectionsReport } from "@/server/queries/inspection.queries";
import { InspectionsReportContent } from "@/features/inspections/components/inspections-report-content";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function InspeksjonRapportPage({ searchParams }: PageProps) {
  const t = await getTranslations("dashboardInspectionsReportPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : nb;
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) return notFound();

  const permissions = getPermissions(session.user.role);
  if (!permissions.canReadInspections) redirect("/dashboard");

  const sp = await searchParams;
  const year = parseInt(sp.year ?? String(new Date().getFullYear()), 10);
  const monthParam = sp.month ? parseInt(sp.month, 10) : null;

  const refDate = new Date(year, monthParam !== null ? monthParam - 1 : 0, 1);
  const startDate = monthParam !== null ? startOfMonth(refDate) : startOfYear(refDate);
  const endDate = monthParam !== null ? endOfMonth(refDate) : endOfYear(refDate);

  const periodLabel =
    monthParam !== null
      ? format(refDate, "MMMM yyyy", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase())
      : `${year}`;

  const { tenantId } = session.user;

  const initialData = await fetchInspectionsReport(tenantId, startDate, endDate);

  const pdfUrl = `/api/inspections/rapport?year=${year}${monthParam !== null ? `&month=${monthParam}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inspections">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("actions.back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">
              {monthParam !== null ? periodLabel : t("yearReport", { year: periodLabel })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-700 hover:bg-green-800">
              <Download className="h-4 w-4 mr-2" />
              {t("actions.downloadPdf")}
            </Button>
          </a>
        </div>
      </div>

      <PeriodSelector currentYear={year} currentMonth={monthParam} />

      <InspectionsReportContent
        initialData={initialData}
        locale={locale}
        year={year}
        monthParam={monthParam}
        periodLabel={periodLabel}
        tenantId={tenantId}
        startDate={startDate.toISOString()}
        endDate={endDate.toISOString()}
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
        <XCircle className="h-3 w-3 shrink-0" />
        <span>{t("legal")}</span>
      </div>
    </div>
  );
}
