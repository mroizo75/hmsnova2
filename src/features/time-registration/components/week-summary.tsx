"use client";

import { Clock, Car, HeartPulse, MapPin } from "lucide-react";

interface TimeEntry {
  hours: number;
  timeType: string;
}

interface MileageEntry {
  kilometers: number;
  ratePerKm: number | null;
  amount: number | null;
}

interface WeekSummaryProps {
  timeEntries: TimeEntry[];
  mileageEntries: MileageEntry[];
  weeklyNorm: number;
  defaultKmRate: number;
}

export function WeekSummary({
  timeEntries,
  mileageEntries,
  weeklyNorm,
  defaultKmRate,
}: WeekSummaryProps) {
  const workTypes = ["NORMAL", "OVERTIME_50", "OVERTIME_40", "OVERTIME_100", "WEEKEND"];
  const workHours = timeEntries
    .filter((e) => workTypes.includes(e.timeType))
    .reduce((s, e) => s + e.hours, 0);
  const overtimeHours = timeEntries
    .filter((e) => ["OVERTIME_50", "OVERTIME_40", "OVERTIME_100", "WEEKEND"].includes(e.timeType))
    .reduce((s, e) => s + e.hours, 0);
  const travelHours = timeEntries
    .filter((e) => e.timeType === "TRAVEL")
    .reduce((s, e) => s + e.hours, 0);
  const sickHours = timeEntries
    .filter((e) => e.timeType === "SICK_LEAVE")
    .reduce((s, e) => s + e.hours, 0);
  const totalKm = mileageEntries.reduce((s, e) => s + e.kilometers, 0);
  const totalKmAmount = mileageEntries.reduce(
    (s, e) => s + (e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRate)),
    0
  );

  const progressPercent = Math.min(100, (workHours / weeklyNorm) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {workHours.toFixed(1)} / {weeklyNorm.toFixed(1)} t
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryCard
          icon={Clock}
          label="Arbeid"
          value={`${workHours.toFixed(1)} t`}
          sub={overtimeHours > 0 ? `herav ${overtimeHours.toFixed(1)} t overtid` : undefined}
        />
        <SummaryCard
          icon={Car}
          label="Reise"
          value={`${travelHours.toFixed(1)} t`}
        />
        <SummaryCard
          icon={HeartPulse}
          label="Sykefravær"
          value={`${sickHours.toFixed(1)} t`}
        />
        <SummaryCard
          icon={MapPin}
          label="Km godtgjørelse"
          value={`${totalKm.toFixed(0)} km`}
          sub={totalKmAmount > 0 ? `${Math.round(totalKmAmount)} kr` : undefined}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
