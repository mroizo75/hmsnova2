"use client";

import { useMemo } from "react";
import type { AbsenceType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAbsenceTypeLabel } from "./absence-type-badge";

type MonthStat = {
  month: string;
  sickDays: number;
  workdays: number;
  percentage: number;
};

type AbsenceStats = {
  totalSickDays: number;
  totalWorkdays: number;
  sickLeavePercentage: number;
  selfCertifiedPercentage: number;
  longTermPercentage: number;
  byMonth: MonthStat[];
  byType: Partial<Record<AbsenceType, number>>;
  byDepartment?: Record<string, { sickDays: number; workdays: number; percentage: number }>;
};

interface AbsenceStatsDashboardProps {
  stats: AbsenceStats;
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export function AbsenceStatsDashboard({ stats }: AbsenceStatsDashboardProps) {
  const maxMonthPercentage = useMemo(
    () => Math.max(...stats.byMonth.map((m) => m.percentage), 1),
    [stats.byMonth],
  );

  return (
    <div className="space-y-6">
      {/* AML § 5-1 (4) — Sykefraværsstatistikk */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Totalt sykefravær"
          value={`${stats.sickLeavePercentage.toFixed(1)}%`}
          description={`${stats.totalSickDays} sykedager av ${stats.totalWorkdays} arbeidsdager`}
        />
        <StatCard
          title="Egenmelding"
          value={`${stats.selfCertifiedPercentage.toFixed(1)}%`}
          description="Andel egenmeldt fravær"
        />
        <StatCard
          title="Langtidsfravær"
          value={`${stats.longTermPercentage.toFixed(1)}%`}
          description="Fravær over 16 dager"
        />
      </div>

      {/* Søylediagram — sykefravær per måned */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Sykefravær per måned (siste 12 mnd)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {stats.byMonth.map((month) => {
              const height = (month.percentage / maxMonthPercentage) * 100;
              return (
                <div
                  key={month.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {month.percentage.toFixed(1)}%
                  </span>
                  <div className="w-full flex items-end h-36">
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        month.percentage > 6
                          ? "bg-red-400"
                          : month.percentage > 3
                            ? "bg-yellow-400"
                            : "bg-green-400",
                      )}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {month.month}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fordeling per type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fordeling per type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(
              Object.entries(stats.byType) as [AbsenceType, number][]
            ).map(([type, days]) => {
              const pct =
                stats.totalWorkdays > 0
                  ? (days / stats.totalWorkdays) * 100
                  : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{getAbsenceTypeLabel(type)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {days} dager ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${stats.totalSickDays > 0 ? (days / stats.totalSickDays) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fordeling per avdeling */}
      {stats.byDepartment && Object.keys(stats.byDepartment).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sykefravær per avdeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byDepartment).map(([dept, data]) => (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{dept}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {data.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        data.percentage > 6
                          ? "bg-red-400"
                          : data.percentage > 3
                            ? "bg-yellow-400"
                            : "bg-green-400",
                      )}
                      style={{ width: `${Math.min(data.percentage * 5, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
