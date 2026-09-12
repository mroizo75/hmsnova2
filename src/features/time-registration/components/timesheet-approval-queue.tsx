"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

export function TimesheetApprovalQueue() {
  const t = useTranslations("timesheet");
  const { toast } = useToast();
  const [data, setData] = useState<QueuePayload | null>(null);
  const [jobs, setJobs] = useState<Array<{
    id: string;
    action: string;
    status: string;
    lastError: string | null;
    entityType: string;
    attempts: number;
  }>>([]);

  async function reload() {
    const [queue, log] = await Promise.all([listTimesheetApprovalQueue(), listAccountingSyncLog()]);
    setData(queue);
    setJobs(log);
  }

  useEffect(() => {
    reload();
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {data.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyQueue")}</p>
        ) : (
          data.entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {entry.user.name || entry.user.email} · {entry.hours} t
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.project.name} · {entry.comment}
                  </p>
                </div>
                <Badge variant="outline" className="bg-transparent">
                  {entry.approvalStatus}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  defaultValue={entry.billingActivityId ?? ""}
                  placeholder={t("activity")}
                  onBlur={(e) =>
                    updateTimesheetStreams(entry.id, { billingActivityId: e.target.value || null })
                  }
                />
                <select
                  className="h-10 rounded-md border bg-transparent px-2 text-sm"
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const res = await approveTimesheetEntries([entry.id]);
                    toast({ title: res.success ? t("approved") : res.error });
                    reload();
                  }}
                >
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  onClick={async () => {
                    const reason = window.prompt(t("rejectReason")) ?? "";
                    if (!reason) return;
                    await rejectTimesheetEntry(entry.id, reason);
                    reload();
                  }}
                >
                  {t("reject")}
                </Button>
                {entry.approvalStatus === "SYNC_ERROR" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent"
                    onClick={async () => {
                      await retryTimesheetSync(entry.id);
                      reload();
                    }}
                  >
                    {t("retry")}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">{t("syncLog")}</h3>
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-start justify-between gap-2 rounded border p-2 text-sm">
              <div>
                <p>
                  {job.action} · {job.entityType} · {job.status}
                </p>
                {job.lastError && <p className="text-xs text-red-600">{job.lastError}</p>}
              </div>
              {job.status === "ERROR" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  onClick={async () => {
                    await retryAccountingSyncJob(job.id);
                    reload();
                  }}
                >
                  {t("retry")}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
