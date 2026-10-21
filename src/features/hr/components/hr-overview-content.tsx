"use client";

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HrOverview } from "@/server/queries/hr-overview.queries";
import { getSickLeaveTemplate } from "@/features/employee-reviews/lib/sick-leave-templates";

const MILESTONE_LABEL: Record<string, string> = {
  FOLLOW_UP_PLAN: "Oppfølgingsplan · senest 4 uker",
  DIALOG_MEETING_1: "Dialogmøte 1 · senest 7 uker",
  ACTIVITY_REQUIREMENT: "Aktivitetskrav · 8 uker",
  DIALOG_MEETING_2: "Dialogmøte 2 · senest 26 uker",
  DIALOG_MEETING_3: "Dialogmøte 3",
  MAX_DATE: "Maksdato sykepenger · 52 uker",
};

const KIND_LABEL = {
  absence: "Fravær",
  boarding: "Onboarding",
  review: "Samtale",
} as const;

function StatCard({
  href,
  title,
  value,
  hint,
}: {
  href: string;
  title: string;
  value: number | null;
  hint: string;
}) {
  if (value === null) return null;
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HrOverviewContent({ overview }: { overview: HrOverview }) {
  const stats = [
    {
      href: "/dashboard/personalarkiv",
      title: "Ansatte",
      value: overview.employeeCount,
      hint: "Personalmapper du har innsyn i",
    },
    {
      href: "/dashboard/fravaer",
      title: "Til godkjenning",
      value: overview.pendingAbsences,
      hint: "Fravær som venter",
    },
    {
      href: "/dashboard/fravaer",
      title: "På sykefravær",
      value: overview.activeSickLeaves,
      hint: "Oppfølging etter AML § 4-6",
    },
    {
      href: "/dashboard/onboarding",
      title: "Onboarding",
      value: overview.activeBoardings,
      hint: "Pågående inn- og utmelding",
    },
    {
      href: "/dashboard/medarbeidersamtale",
      title: "Samtaler",
      value: overview.upcomingReviews,
      hint: "Planlagt eller forberedt",
    },
    {
      href: "/dashboard/avdelinger",
      title: "Avdelinger",
      value: overview.departmentCount,
      hint: "Aktive organisasjonsenheter",
    },
  ].filter((item) => item.value !== null);

  return (
    <div className="space-y-6">
      {stats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sykefravær som krever samtale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Oppfølgingsplan skal være klar senest etter fire uker, og dialogmøte 1 senest innen sju uker ved fullt fravær (AML § 4-6). Samtalen ligger under Samtaler, med egen mal. Ikke registrer diagnose.
          </p>
          {overview.sickFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen åpne sykefraværsfrister.</p>
          ) : (
            <ul className="divide-y">
              {overview.sickFollowUps.map((item) => {
                const template = getSickLeaveTemplate(item.templateKey);
                const href = template
                  ? `/dashboard/medarbeidersamtale/ny?ansatt=${item.employeeId}&type=SYKEFRAVAER&mal=${template.key}&fravaer=${item.absenceId}`
                  : `/dashboard/fravaer/${item.absenceId}`;
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      className="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.employeeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {MILESTONE_LABEL[item.milestone] ?? item.milestone}
                          {template ? ` · ${template.title}` : ""}
                        </p>
                      </div>
                      <span className={item.overdue ? "shrink-0 text-xs text-destructive" : "shrink-0 text-xs text-muted-foreground"}>
                        {item.overdue ? "Frist passert · " : ""}
                        {format(new Date(item.dueDate), "d. MMM yyyy", { locale: nb })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neste i HR-løpet</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen ventende godkjenninger, onboarding eller planlagte samtaler.
            </p>
          ) : (
            <ul className="divide-y">
              {overview.attention.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.meta}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
