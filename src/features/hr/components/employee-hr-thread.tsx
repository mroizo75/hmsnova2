"use client";

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarDays, MessageSquare, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmployeeHrThread } from "@/server/queries/hr-overview.queries";

const ABSENCE_TYPE_LABEL: Record<string, string> = {
  SELF_CERTIFIED: "Egenmelding",
  SICK_LEAVE: "Sykemelding",
  PARENTAL_LEAVE: "Foreldrepermisjon",
  VACATION: "Ferie",
  LEAVE_OF_ABSENCE: "Permisjon",
  COMPENSATORY: "Avspasering",
  CARE_DAYS: "Omsorgsdager",
  MILITARY: "Militærtjeneste",
  BEREAVEMENT: "Velferdspermisjon",
  OTHER: "Annet fravær",
};

export function EmployeeHrThreadCard({
  employeeName,
  thread,
}: {
  employeeName: string;
  thread: EmployeeHrThread;
}) {
  const search = encodeURIComponent(employeeName);
  const items = [
    thread.currentAbsence
      ? {
          href: `/dashboard/fravaer/${thread.currentAbsence.id}`,
          icon: CalendarDays,
          title: ABSENCE_TYPE_LABEL[thread.currentAbsence.type] ?? "Fravær",
          meta: `Pågår til ${format(new Date(thread.currentAbsence.endDate), "d. MMM yyyy", { locale: nb })}`,
        }
      : {
          href: `/dashboard/fravaer?ansatt=${search}`,
          icon: CalendarDays,
          title: "Fravær og sykdom",
          meta:
            thread.pendingAbsenceCount > 0
              ? `${thread.pendingAbsenceCount} venter på godkjenning`
              : "Ingen pågående fravær",
        },
    {
      href: thread.activeBoarding
        ? `/dashboard/onboarding/${thread.activeBoarding.id}`
        : "/dashboard/onboarding",
      icon: UserPlus,
      title: thread.activeBoarding
        ? thread.activeBoarding.type === "OFFBOARDING"
          ? "Offboarding"
          : "Onboarding"
        : "Onboarding",
      meta: thread.activeBoarding ? "Prosess pågår" : "Ingen aktiv prosess",
    },
    {
      href: thread.upcomingReview
        ? `/dashboard/medarbeidersamtale/${thread.upcomingReview.id}`
        : "/dashboard/medarbeidersamtale",
      icon: MessageSquare,
      title: "Medarbeidersamtale",
      meta: thread.upcomingReview
        ? `Planlagt ${format(new Date(thread.upcomingReview.scheduledDate), "d. MMM yyyy", { locale: nb })}`
        : "Ingen planlagt samtale",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>HR-løp for denne ansatte</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
          >
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.meta}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
