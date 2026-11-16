"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelOvertimeRequest,
  createOvertimeRequest,
  decideOvertimeRequest,
  listOvertimeRequests,
} from "@/server/actions/overtime-request.actions";

type ListData = Extract<Awaited<ReturnType<typeof listOvertimeRequests>>, { success: true }>["data"];

function todayValue(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(new Date());
}

export function OvertimePanel() {
  const t = useTranslations("timesheet");
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayValue);
  const [hours, setHours] = useState("1");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["overtime-requests"],
    queryFn: () => listOvertimeRequests(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["overtime-requests"] });

  const create = useMutation({
    mutationFn: () => createOvertimeRequest({ date, hours: Number(hours), reason }),
    onSuccess: (result) => {
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setFormError(null);
      setReason("");
      refresh();
    },
  });

  const list = data?.success ? data.data : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("overtime.title")}</CardTitle>
          <CardDescription>{t("overtime.intro")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="overtime-date">{t("overtime.date")}</Label>
              <Input id="overtime-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="overtime-hours">{t("overtime.hours")}</Label>
              <Input
                id="overtime-hours"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor="overtime-reason">{t("overtime.reason")}</Label>
              <Textarea
                id="overtime-reason"
                value={reason}
                placeholder={t("overtime.reasonPlaceholder")}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? t("overtime.sending") : t("overtime.submit")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("overtime.limitsTitle")}</CardTitle>
          <CardDescription>{t("overtime.limitsHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !list ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <ul className="space-y-2">
              {list.limits.map((window) => (
                <li key={window.key} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {t(`overtime.window.${window.key}`)} · {window.used} / {window.cap} t
                  </span>
                  <span className={levelClass(window.level)}>{t(`overtime.level.${window.level}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {list?.canApprove && (
        <RequestList
          title={t("overtime.pending")}
          empty={t("overtime.pendingEmpty")}
          rows={list.pending}
          onChanged={refresh}
          canDecide
        />
      )}

      {list && (
        <RequestList
          title={t("overtime.mine")}
          empty={t("overtime.empty")}
          rows={list.mine}
          onChanged={refresh}
          canDecide={false}
        />
      )}
    </div>
  );
}

function RequestList({
  title,
  empty,
  rows,
  onChanged,
  canDecide,
}: {
  title: string;
  empty: string;
  rows: Array<ListData["mine"][number] & { userName?: string }>;
  onChanged: () => void;
  canDecide: boolean;
}) {
  const t = useTranslations("timesheet");
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  {row.userName && <p className="font-medium">{row.userName}</p>}
                  <p className={row.userName ? "text-sm" : "font-medium"}>
                    {format(new Date(`${row.date}T00:00:00`), "d. MMM yyyy", { locale: nb })} · {row.hours} t
                  </p>
                  <p className="text-sm text-muted-foreground">{row.reason}</p>
                  <p className="text-xs text-muted-foreground">{t(`overtime.status.${row.status}`)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canDecide && row.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const result = await decideOvertimeRequest({ id: row.id, decision: "APPROVED" });
                          if (!result.success) setError(result.error);
                          else onChanged();
                        }}
                      >
                        {t("overtime.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={async () => {
                          const result = await decideOvertimeRequest({ id: row.id, decision: "REJECTED" });
                          if (!result.success) setError(result.error);
                          else onChanged();
                        }}
                      >
                        {t("overtime.reject")}
                      </Button>
                    </>
                  )}
                  {!canDecide && (row.status === "PENDING" || row.status === "APPROVED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent"
                      onClick={async () => {
                        const result = await cancelOvertimeRequest({ id: row.id });
                        if (!result.success) setError(result.error);
                        else onChanged();
                      }}
                    >
                      {t("overtime.cancel")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function levelClass(level: "ok" | "near" | "over"): string {
  if (level === "over") return "text-destructive";
  if (level === "near") return "text-amber-700";
  return "text-muted-foreground";
}
