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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  approveTimesheetEntries,
  listAccountingSyncLog,
  listTimesheetApprovalQueue,
  rejectTimesheetEntry,
  retryAccountingSyncJob,
  retryTimesheetSync,
  updateTimesheetStreams,
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

  async function reload() {
    const [queue, log] = await Promise.all([listTimesheetApprovalQueue(), listAccountingSyncLog()]);
    setData(queue);
    setJobs(log);
  }

  useEffect(() => {
    reload();
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;

  const activities = data.activities ?? [];
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
          {data.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyQueue")}</p>
          ) : (
            data.entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {entry.user.name || entry.user.email} · {entry.hours} {t("hoursSuffix")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(entry.date, locale)} · {entry.project.name}
                      {entry.comment ? ` · ${entry.comment}` : ""}
                    </p>
                    {entry.rejectionReason && (
                      <p className="text-xs text-red-600">{entry.rejectionReason}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-transparent">
                    {t(`status.${APPROVAL_STATUS_KEY[entry.approvalStatus] ?? "submitted"}`)}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("activityHelp")}</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
                      defaultValue={entry.billingActivityId ?? ""}
                      onChange={(e) =>
                        updateTimesheetStreams(entry.id, { billingActivityId: e.target.value || null })
                      }
                    >
                      <option value="">{t("activity")}</option>
                      {activities.map((a: { externalId: string; name: string }) => (
                        <option key={a.externalId} value={a.externalId}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("salaryTypeHelp")}</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
                      defaultValue={entry.salaryTypeId ?? ""}
                      onChange={(e) =>
                        updateTimesheetStreams(entry.id, { salaryTypeId: e.target.value || null })
                      }
                    >
                      <option value="">{t("salaryType")}</option>
                      {data.salaryTypes.map((s) => (
                        <option key={s.externalId} value={s.externalId}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === entry.id}
                    onClick={async () => {
                      setBusyId(entry.id);
                      const res = await approveTimesheetEntries([entry.id]);
                      toast({ title: res.success ? t("approved") : res.error });
                      await reload();
                      setBusyId(null);
                    }}
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent"
                    disabled={busyId === entry.id}
                    onClick={async () => {
                      const reason = window.prompt(t("rejectReason")) ?? "";
                      if (!reason) return;
                      setBusyId(entry.id);
                      await rejectTimesheetEntry(entry.id, reason);
                      await reload();
                      setBusyId(null);
                    }}
                  >
                    {t("reject")}
                  </Button>
                  {(entry.approvalStatus === "SYNC_ERROR" || entry.syncStatus === "ERROR") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent"
                      disabled={busyId === entry.id}
                      onClick={async () => {
                        setBusyId(entry.id);
                        await retryTimesheetSync(entry.id);
                        await reload();
                        setBusyId(null);
                      }}
                    >
                      {t("retry")}
                    </Button>
                  )}
                </div>
              </div>
            ))
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
