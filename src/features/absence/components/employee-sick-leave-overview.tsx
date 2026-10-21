import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMySickLeaveOverview } from "@/server/queries/employee-sick-leave.queries";
import { getSickLeaveTemplate } from "@/features/employee-reviews/lib/sick-leave-templates";

const TYPE_LABEL: Record<string, string> = {
  SELF_CERTIFIED: "Egenmelding",
  SICK_LEAVE: "Sykmelding",
};

const MILESTONE_LABEL: Record<string, string> = {
  FOLLOW_UP_PLAN: "Oppfølgingsplan",
  DIALOG_MEETING_1: "Dialogmøte 1",
  ACTIVITY_REQUIREMENT: "Aktivitetskrav",
  DIALOG_MEETING_2: "Dialogmøte 2",
  DIALOG_MEETING_3: "Dialogmøte 3",
  MAX_DATE: "Maksdato for sykepenger",
};

function statusLabel(status: string, overdue: boolean): string {
  if (status === "COMPLETED") return "Gjennomført";
  if (status === "SKIPPED") return "Ikke nødvendig";
  if (status === "IN_PROGRESS") return "Pågår";
  if (overdue) return "Frist passert";
  return "Venter";
}

export async function EmployeeSickLeaveOverview() {
  const cases = await fetchMySickLeaveOverview();
  if (cases.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Din sykefraværsoppfølging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Oppfølgingsplanen lages sammen med deg, og du skal innkalles til dialogmøte. Det følger av arbeidsmiljøloven § 4-6. Leder kaller inn. Her ser du bare ditt eget fravær.
        </p>
        {cases.map((item) => (
          <div key={item.id} className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              {TYPE_LABEL[item.type] ?? "Sykefravær"}
              {item.percentage < 100 ? ` · ${item.percentage} %` : ""}
              {" · "}
              {format(new Date(item.startDate), "d. MMM yyyy", { locale: nb })}
              {" – "}
              {format(new Date(item.endDate), "d. MMM yyyy", { locale: nb })}
            </p>
            {item.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen frister er opprettet ennå.</p>
            ) : (
              <ul className="divide-y">
                {item.milestones.map((milestone) => {
                  const template = getSickLeaveTemplate(milestone.templateKey);
                  return (
                    <li key={milestone.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm">{MILESTONE_LABEL[milestone.milestone] ?? milestone.milestone}</p>
                        <p className="text-xs text-muted-foreground">
                          {statusLabel(milestone.status, milestone.overdue)}
                          {" · "}
                          {format(new Date(milestone.dueDate), "d. MMM yyyy", { locale: nb })}
                          {template ? ` · ${template.legalRef}` : ""}
                        </p>
                      </div>
                      {milestone.reviewId ? (
                        <Link
                          href={`/ansatt/medarbeidersamtale/${milestone.reviewId}`}
                          className="shrink-0 text-sm text-primary underline-offset-2 hover:underline"
                        >
                          {milestone.awaitingConfirmation ? "Bekreft" : "Åpne samtale"}
                        </Link>
                      ) : template ? (
                        <span className="shrink-0 text-xs text-muted-foreground">Leder kaller inn</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
