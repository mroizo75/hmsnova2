"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderKanban,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { groupApprovalDays } from "@/lib/time/approval-groups";
import {
  approveTimesheetEntries,
  listAccountingSyncLog,
  listTimesheetApprovalQueue,
  rejectTimesheetEntry,
  retryAccountingSyncJob,
  retryTimesheetSync,
  reviseApprovalDay,
} from "@/server/actions/timesheet.actions";

type QueuePayload = Awaited<ReturnType<typeof listTimesheetApprovalQueue>>;
type SyncLogItem = Awaited<ReturnType<typeof listAccountingSyncLog>>[number];

const APPROVAL_STATUS_KEY: Record<string, "draft" | "submitted" | "approved" | "rejected" | "synced" | "syncError"> = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  SYNCED: "synced",
  SYNC_ERROR: "syncError",
};

const SYNC_ACTIONS = [
  "CREATE_PROJECT",
  "UPDATE_PROJECT",
  "UPSERT_TIME",
  "DELETE_TIME",
  "UPSERT_LINE",
  "CREATE_INVOICE",
  "PULL_MASTER",
  "UPSERT_ABSENCE",
] as const;

function ApprovalDayEditor({
  day,
  projects,
  activities,
  salaryTypes,
  onSaved,
}: {
  day: ReturnType<typeof groupApprovalDays>[number];
  projects: Array<{ id: string; name: string }>;
  activities: Array<{ externalId: string; name: string }>;
  salaryTypes: Array<{ externalId: string; name: string }>;
  onSaved: () => Promise<void>;
}) {
  const t = useTranslations("timesheet");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(day.projectId);
  const [clockFrom, setClockFrom] = useState(day.clockFrom ?? "");
  const [clockTo, setClockTo] = useState(day.clockTo ?? "");
  const [lunch, setLunch] = useState(String(day.lunchMinutes));
  const [comment, setComment] = useState(day.comment ?? "");
  const [activityId, setActivityId] = useState("");
  const [salaryTypeId, setSalaryTypeId] = useState("");
  const [usage, setUsage] = useState(
    day.usage.map((line) => ({
      id: line.id,
      quantity: String(line.quantity),
      fromAddress: line.fromAddress ?? "",
      toAddress: line.toAddress ?? "",
    }))
  );
  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" className="bg-transparent" onClick={() => setOpen(true)}>
        {t("editDay")}
      </Button>
    );
  }
  return (
    <div className="grid gap-2 rounded-md border p-2">
      <Label className="text-xs">{t("project")}</Label>
      <select className="h-10 rounded-md border bg-transparent px-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <Input type="time" value={clockFrom} onChange={(e) => setClockFrom(e.target.value)} />
        <Input type="time" value={clockTo} onChange={(e) => setClockTo(e.target.value)} />
        <Input inputMode="numeric" value={lunch} onChange={(e) => setLunch(e.target.value)} />
      </div>
      <Input value={comment} onChange={(e) => setComment(e.target.value)} />
      <select className="h-10 rounded-md border bg-transparent px-2 text-sm" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
        <option value="">{t("activity")}</option>
        {activities.map((activity) => (
          <option key={activity.externalId} value={activity.externalId}>{activity.name}</option>
        ))}
      </select>
      <select className="h-10 rounded-md border bg-transparent px-2 text-sm" value={salaryTypeId} onChange={(e) => setSalaryTypeId(e.target.value)}>
        <option value="">{t("salaryType")}</option>
        {salaryTypes.map((salary) => (
          <option key={salary.externalId} value={salary.externalId}>{salary.name}</option>
        ))}
      </select>
      {usage.map((line, index) => (
        <div key={line.id} className="grid grid-cols-3 gap-2">
          <Input
            inputMode="decimal"
            value={line.quantity}
            onChange={(e) => setUsage((rows) => rows.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))}
          />
          <Input
            value={line.fromAddress}
            onChange={(e) => setUsage((rows) => rows.map((row, i) => i === index ? { ...row, fromAddress: e.target.value } : row))}
          />
          <Input
            value={line.toAddress}
            onChange={(e) => setUsage((rows) => rows.map((row, i) => i === index ? { ...row, toAddress: e.target.value } : row))}
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        onClick={async () => {
          const res = await reviseApprovalDay({
            entryIds: day.entryIds,
            projectId,
            clockFrom,
            clockTo,
            lunchMinutes: Number(lunch),
            comment,
            billingActivityId: activityId || null,
            salaryTypeId: salaryTypeId || null,
            usage: usage.map((line) => ({
              id: line.id,
              quantity: Number(line.quantity.replace(",", ".")),
              fromAddress: line.fromAddress,
              toAddress: line.toAddress,
            })),
          });
          toast({ title: res.success ? t("saved") : res.error, variant: res.success ? "default" : "destructive" });
          if (res.success) {
            setOpen(false);
            await onSaved();
          }
        }}
      >
        {t("saveComment")}
      </Button>
    </div>
  );
}

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStartIso() {
  const date = new Date();
  return localIso(new Date(date.getFullYear(), date.getMonth(), 1));
}

function hoursLabel(value: number, locale: string) {
  return value.toLocaleString(locale === "en" ? "en-GB" : "nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function payLabel(
  day: ReturnType<typeof groupApprovalDays>[number],
  t: (key: string) => string,
  locale: string
) {
  const parts: string[] = [];
  if (day.normal) parts.push(`${hoursLabel(day.normal, locale)} ${t("ordinary")}`);
  if (day.ot50) parts.push(`${hoursLabel(day.ot50, locale)} ${t("overtime50")}`);
  if (day.ot100) parts.push(`${hoursLabel(day.ot100, locale)} ${t("overtime100")}`);
  return parts.join(" · ");
}

function extraLabel(
  day: ReturnType<typeof groupApprovalDays>[number],
  t: (key: string) => string
) {
  return day.usage
    .map((line) =>
      line.kind === "KM"
        ? `${line.quantity} km`
        : `${line.quantity} ${line.kind === "MACHINE" ? t("kind.MACHINE") : t("kind.PRODUCT")}`
    )
    .join(", ");
}

function formatDay(value: string | Date, locale: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SyncIcon({ action, className }: { action: string; className?: string }) {
  if (action === "UPSERT_TIME" || action === "UPSERT_ABSENCE" || action === "DELETE_TIME") {
    return <Clock className={className} />;
  }
  if (action === "UPSERT_LINE" || action === "CREATE_INVOICE") {
    return <Package className={className} />;
  }
  if (action === "CREATE_PROJECT" || action === "UPDATE_PROJECT") {
    return <FolderKanban className={className} />;
  }
  return <RefreshCw className={className} />;
}

export function TimesheetApprovalQueue() {
  const t = useTranslations("timesheet");
  const locale = useLocale();
  const { toast } = useToast();
  const [data, setData] = useState<QueuePayload | null>(null);
  const [jobs, setJobs] = useState<SyncLogItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [from, setFrom] = useState(monthStartIso);
  const [to, setTo] = useState(() => localIso(new Date()));
  const [query, setQuery] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [hideApproved, setHideApproved] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const pageSize = 50;

  async function reload() {
    const [queue, log] = await Promise.all([
      listTimesheetApprovalQueue({ from, to }),
      listAccountingSyncLog(),
    ]);
    setData(queue);
    setJobs(log);
    setSelected([]);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTimesheetApprovalQueue({ from, to }), listAccountingSyncLog()]).then(([queue, log]) => {
      if (cancelled) return;
      setData(queue);
      setJobs(log);
      setSelected([]);
      setPage(0);
    });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  if (!data) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;

  const days = groupApprovalDays(data.entries, data.usage ?? []);
  const employees = [...new Map(days.map((day) => [day.userId, day.userName])).entries()];
  const filtered = days.filter((day) => {
    if (hideApproved && (day.status === "APPROVED" || day.status === "SYNCED")) return false;
    if (employeeId && day.userId !== employeeId) return false;
    if (projectFilter && day.projectId !== projectFilter) return false;
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;
    const main = day.parentName ?? day.projectName;
    const sub = day.parentName ? day.projectName : "";
    const hay = [day.userName, main, sub, day.comment ?? "", day.date].join(" ").toLowerCase();
    return words.every((word) => hay.includes(word));
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const totalHours = filtered.reduce((sum, day) => sum + day.normal + day.ot50 + day.ot100, 0);
  const waiting = filtered.filter((day) => day.status === "SUBMITTED" || day.status === "SYNC_ERROR").length;
  const selectedDays = filtered.filter((day) => selected.includes(day.key));
  const selectedIds = selectedDays
    .filter((day) => day.status === "SUBMITTED" || day.status === "SYNC_ERROR")
    .flatMap((day) => day.entryIds);
  const allVisibleSelected = visible.length > 0 && visible.every((day) => selected.includes(day.key));

  const okCount = jobs.filter((job) => job.status === "SYNCED").length;
  const pendingCount = jobs.filter((job) => job.status === "PENDING").length;
  const errorCount = jobs.filter((job) => job.status === "ERROR").length;

  function actionLabel(action: string) {
    return SYNC_ACTIONS.includes(action as (typeof SYNC_ACTIONS)[number])
      ? t(`syncActions.${action as (typeof SYNC_ACTIONS)[number]}`)
      : action;
  }

  function actionHelp(action: string) {
    return SYNC_ACTIONS.includes(action as (typeof SYNC_ACTIONS)[number])
      ? t(`syncActionHelp.${action as (typeof SYNC_ACTIONS)[number]}`)
      : "";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("tabs.approval")}</CardTitle>
          <CardDescription>{t("approvalHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("approvalFrom")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("approvalTo")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={t("approvalSearch")}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 rounded-md border bg-transparent px-2 text-sm"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">{t("approvalAllEmployees")}</option>
              {employees.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border bg-transparent px-2 text-sm"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">{t("approvalAllProjects")}</option>
              {(data.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideApproved}
                onChange={(e) => {
                  setHideApproved(e.target.checked);
                  setPage(0);
                }}
              />
              {t("hideApproved")}
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("approvalSummary", {
              hours: hoursLabel(totalHours, locale),
              projects: new Set(filtered.map((day) => day.projectId)).size,
              employees: new Set(filtered.map((day) => day.userId)).size,
              waiting,
            })}
          </p>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyQueue")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {t("approvalShowing", {
                    shown: visible.length,
                    total: filtered.length,
                  })}
                </p>
                <Button
                  size="sm"
                  disabled={selectedIds.length === 0 || busyId === "selected"}
                  onClick={async () => {
                    setBusyId("selected");
                    const res = await approveTimesheetEntries(selectedIds);
                    toast({ title: res.success ? t("approved") : res.error });
                    await reload();
                    setBusyId(null);
                  }}
                >
                  {t("approveSelected")}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="w-8 py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => {
                            const keys = visible.map((day) => day.key);
                            setSelected((current) =>
                              e.target.checked
                                ? [...new Set([...current, ...keys])]
                                : current.filter((key) => !keys.includes(key))
                            );
                          }}
                        />
                      </th>
                      <th className="py-2 pr-3">{t("colDate")}</th>
                      <th className="py-2 pr-3">{t("colName")}</th>
                      <th className="py-2 pr-3">{t("project")}</th>
                      <th className="py-2 pr-3">{t("colSubproject")}</th>
                      <th className="py-2 pr-3">{t("colTime")}</th>
                      <th className="py-2 pr-3">{t("colHours")}</th>
                      <th className="py-2 pr-3">{t("colPay")}</th>
                      <th className="py-2 pr-3">{t("colExtra")}</th>
                      <th className="py-2 pr-3">{t("colComment")}</th>
                      <th className="py-2 pr-3">{t("colStatus")}</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((day) => {
                      const main = day.parentName ?? day.projectName;
                      const sub = day.parentName ? day.projectName : "";
                      const canAct = day.status === "SUBMITTED" || day.status === "SYNC_ERROR";
                      return (
                        <tr key={day.key} className="border-b align-top">
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={selected.includes(day.key)}
                              onChange={(e) =>
                                setSelected((current) =>
                                  e.target.checked ? [...current, day.key] : current.filter((key) => key !== day.key)
                                )
                              }
                            />
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDay(day.date, locale)}</td>
                          <td className="py-2 pr-3">{day.userName}</td>
                          <td className="py-2 pr-3">{main}</td>
                          <td className="py-2 pr-3">{sub}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {day.clockFrom ? `${day.clockFrom}–${day.clockTo}` : ""}
                          </td>
                          <td className="py-2 pr-3">{hoursLabel(day.normal + day.ot50 + day.ot100, locale)}</td>
                          <td className="py-2 pr-3">{payLabel(day, t, locale)}</td>
                          <td className="py-2 pr-3">{extraLabel(day, t)}</td>
                          <td className="max-w-[16rem] py-2 pr-3">{day.comment}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="bg-transparent">
                              {t(`status.${APPROVAL_STATUS_KEY[day.status] ?? "submitted"}`)}
                            </Badge>
                          </td>
                          <td className="py-2">
                            {canAct && (
                              <div className="flex flex-col items-start gap-2">
                                <ApprovalDayEditor
                                  day={day}
                                  projects={data.projects ?? []}
                                  activities={data.activities ?? []}
                                  salaryTypes={data.salaryTypes ?? []}
                                  onSaved={reload}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  disabled={busyId === day.key}
                                  onClick={async () => {
                                    const reason = window.prompt(t("rejectReason")) ?? "";
                                    if (!reason) return;
                                    setBusyId(day.key);
                                    for (const id of day.entryIds) await rejectTimesheetEntry(id, reason);
                                    await reload();
                                    setBusyId(null);
                                  }}
                                >
                                  {t("reject")}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  {t("pagePrev")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  {t("pageNext")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("syncLog")}</CardTitle>
          <CardDescription>{t("syncHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("syncEmpty")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("syncCounts", { ok: okCount, pending: pendingCount, error: errorCount })}
              </p>
              <ul className="space-y-2">
                {jobs.map((job) => {
                  const statusKey =
                    job.status === "SYNCED" || job.status === "PENDING" || job.status === "ERROR"
                      ? job.status
                      : "IDLE";
                  return (
                    <li
                      key={job.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                            job.status === "ERROR" && "border-destructive/40 text-destructive",
                            job.status === "SYNCED" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
                            job.status === "PENDING" && "border-border text-muted-foreground"
                          )}
                          aria-hidden
                        >
                          {job.status === "ERROR" ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : job.status === "SYNCED" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <SyncIcon action={job.action} className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium leading-none">{actionLabel(job.action)}</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "bg-transparent",
                                job.status === "ERROR" && "border-destructive/40 text-destructive",
                                job.status === "SYNCED" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                              )}
                            >
                              {t(`syncStatus.${statusKey}`)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.subject || actionHelp(job.action)}
                          </p>
                          {job.errorTitle && (
                            <p className="text-sm text-destructive">{job.errorTitle}</p>
                          )}
                          {job.errorHint && (
                            <p className="text-xs text-muted-foreground">{job.errorHint}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDay(job.createdAt, locale)}</p>
                        </div>
                      </div>
                      {job.canRetry && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent shrink-0"
                          disabled={busyId === job.id}
                          onClick={async () => {
                            setBusyId(job.id);
                            const res = await retryAccountingSyncJob(job.id);
                            if (!res.success) toast({ title: res.error });
                            await reload();
                            setBusyId(null);
                          }}
                        >
                          {busyId === job.id ? t("syncRetrying") : t("retry")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
