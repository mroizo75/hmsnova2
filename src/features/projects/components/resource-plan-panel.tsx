"use client";

import { useEffect, useMemo, useState } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { nb } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import {
  deleteResourceAssignment,
  listResourceWeek,
  upsertResourceAssignment,
} from "@/server/actions/resource-plan.actions";
import { dailyPlannedHours, remainingCapacity } from "@/lib/time/resource-overlap";

type WeekData = Awaited<ReturnType<typeof listResourceWeek>>;

export function ResourcePlanPanel({ projectId }: { projectId?: string }) {
  const t = useTranslations("timesheet");
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1, locale: nb })
  );
  const [data, setData] = useState<WeekData | null>(null);
  const [userId, setUserId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [selectedProject, setSelectedProject] = useState(projectId ?? "");
  const [startDate, setStartDate] = useState(format(weekStart, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(weekStart, 4), "yyyy-MM-dd"));
  const [hours, setHours] = useState("8");

  async function reload() {
    const next = await listResourceWeek(format(weekStart, "yyyy-MM-dd"));
    setData(next);
    if (!userId && next.users[0]) setUserId(next.users[0].userId);
    if (!selectedProject && (projectId || next.projects[0]?.id)) {
      setSelectedProject(projectId || next.projects[0].id);
    }
  }

  useEffect(() => {
    reload();
  }, [weekStart]);

  const visibleUsers = useMemo(() => {
    if (!data) return [];
    if (!filterUserId) return data.users;
    return data.users.filter((u) => u.userId === filterUserId);
  }, [data, filterUserId]);

  if (!data) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dailyCapacity = data.dailyCapacity ?? 7.5;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="bg-transparent"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ←
        </Button>
        <p className="self-center text-sm">{format(weekStart, "d. MMM", { locale: nb })}</p>
        <Button
          type="button"
          variant="outline"
          className="bg-transparent"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          →
        </Button>
        <select
          className="h-10 rounded-md border bg-transparent px-2 text-sm"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
        >
          <option value="">{t("allEmployees")}</option>
          {data.users.map((u) => (
            <option key={u.userId} value={u.userId}>
              {u.user.name || u.user.email}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">{t("employee")}</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="p-2 font-normal">
                  {format(d, "EEE d", { locale: nb })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.userId} className="border-t">
                <td className="p-2">{u.user.name || u.user.email}</td>
                {days.map((d) => {
                  const hit = data.assignments.filter(
                    (a) =>
                      a.userId === u.userId &&
                      new Date(a.startDate) <= d &&
                      new Date(a.endDate) >= d
                  );
                  const clash = hit.length > 1;
                  const planned = hit.reduce(
                    (sum, a) => sum + dailyPlannedHours(a, dailyCapacity),
                    0
                  );
                  const free = remainingCapacity(planned, dailyCapacity);
                  return (
                    <td key={d.toISOString()} className={`p-2 ${clash ? "bg-red-50 text-red-800" : ""}`}>
                      {hit.map((a) => (
                        <p key={a.id} className="text-xs truncate">
                          {a.project.name}
                        </p>
                      ))}
                      {hit.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("available")} {dailyCapacity} t</p>
                      ) : (
                        <p className={`text-xs ${free < 0 ? "text-red-700" : "text-muted-foreground"}`}>
                          {clash ? t("overlap") : t("freeCapacity", { hours: String(free) })}
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("employee")}</Label>
          <select
            className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {data.users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.user.name || u.user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("project")}</Label>
          <select
            className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
        <Button
          onClick={async () => {
            const res = await upsertResourceAssignment({
              userId,
              projectId: selectedProject,
              startDate,
              endDate,
              plannedHours: Number(hours) || undefined,
            });
            if (!res.success) {
              toast({ title: res.error, variant: "destructive" });
              return;
            }
            if (res.overlapWarning) {
              toast({ title: t("doubleBooked") });
            }
            reload();
          }}
        >
          {t("savePlan")}
        </Button>
      </div>

      <div className="space-y-1">
        {data.assignments
          .filter((a) => !filterUserId || a.userId === filterUserId)
          .map((a) => (
          <div key={a.id} className="flex justify-between text-sm">
            <span>
              {a.user.name} · {a.project.name}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await deleteResourceAssignment(a.id);
                reload();
              }}
            >
              {t("remove")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
