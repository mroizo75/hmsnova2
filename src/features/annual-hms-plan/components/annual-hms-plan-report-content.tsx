"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAnnualHmsPlanReport } from "@/server/queries/annual-hms-plan.queries";

type ReportData = NonNullable<Awaited<ReturnType<typeof fetchAnnualHmsPlanReport>>>;

interface AnnualHmsPlanReportContentProps {
  initialData: ReportData;
  year: number;
  generatedAt: string;
}

export function AnnualHmsPlanReportContent({ initialData, year, generatedAt }: AnnualHmsPlanReportContentProps) {
  const { data } = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetchAnnualHmsPlanReport(year),
    initialData,
  });

  if (!data) return null;

  const { steps, completedCount, totalCount, tenantName } = data;

  return (
    <>
      <header className="border-b pb-4 print:border-none">
        <h1 className="text-3xl font-bold">Årlig HMS-plan – rapport {year}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Oversikt over alle steg i den årlige HMS-planen for valgt år, med status og dato for gjennomføring.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Generert: {generatedAt}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tenant: {tenantName}
        </p>
      </header>

      <section className="space-y-2">
        <p className="text-sm">
          Fullført: <span className="font-semibold">{completedCount}</span> av{" "}
          <span className="font-semibold">{totalCount}</span> steg.
        </p>
      </section>

      <section className="space-y-3">
        {steps.map((step: any) => (
          <div
            key={step.key}
            className="rounded-lg border p-3 text-sm break-inside-avoid print:border print:p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-semibold">{step.title}</h2>
                <p className="text-xs uppercase text-muted-foreground">{step.category}</p>
              </div>
              <div className="text-right text-xs">
                <p
                  className={step.completedAt ? "font-semibold text-green-700 dark:text-green-300" : "font-semibold text-red-700 dark:text-red-300"}
                >
                  {step.completedAt ? "Fullført" : "Ikke fullført"}
                </p>
                {step.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Dato: {new Date(step.completedAt).toLocaleDateString("nb-NO")}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            {step.legalRef && (
              <p className="mt-1 text-xs text-muted-foreground">Krav: {step.legalRef}</p>
            )}
          </div>
        ))}
      </section>

      <p className="mt-4 text-xs text-muted-foreground print:text-[10px]">
        Denne rapporten dokumenterer gjennomføringen av årlig HMS-plan i henhold til definerte steg i HMS-systemet.
        Bruk rapporten som vedlegg til ledelsens gjennomgang, styremøter eller eksterne revisjoner.
      </p>
    </>
  );
}
