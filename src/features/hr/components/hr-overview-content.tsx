"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HrOverview } from "@/server/queries/hr-overview.queries";

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
      hint: "Sykemelding og egenmelding nå",
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
