"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Car, CheckCircle2, Package, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { nextDefaultClock } from "@/lib/time/split-day";
import {
  getDayTimesheetContext,
  searchGeonorgeAddresses,
  submitDayTimesheet,
  syncTimesheetProjectsNow,
  updateOwnTimesheetEntry,
} from "@/server/actions/timesheet.actions";
import { ProductLineEditor, type PendingProductLine } from "./product-line-editor";
import {
  childProjectsOf,
  pickerRootId,
  topLevelPickableProjects,
  type PickableProject,
} from "@/lib/time/project-search";
import { ProjectPicker } from "./project-picker";
import { DayAbsenceForm } from "./day-absence-form";
import { NewFieldJobDialog } from "@/features/jobs/components/new-field-job-dialog";

type UsageKind = "PRODUCT" | "MACHINE";
type CarKind = "COMPANY" | "PRIVATE";

type Entry = {
  id: string;
  hours: number;
  timeType: string;
  comment: string | null;
  rejectionReason?: string | null;
  approvalStatus: string;
  clockFrom: string | null;
  clockTo: string | null;
  project: { name: string };
};

type SavedUsage = {
  id: string;
  kind: UsageKind | "KM";
  productName: string;
  quantity: number;
  comment: string | null;
  isPrivateCar: boolean;
  kmTaxable: boolean;
  syncStatus: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function UsageIcon({ kind, className }: { kind: UsageKind | "KM"; className?: string }) {
  if (kind === "KM") return <Car className={className} />;
  if (kind === "MACHINE") return <Wrench className={className} />;
  return <Package className={className} />;
}

export function DayTimesheetScreen({ isEmployee = false }: { isEmployee?: boolean }) {
  const t = useTranslations("timesheet");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "nb-NO";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || todayIso());
  const [clockFrom, setClockFrom] = useState("07:00");
  const [clockTo, setClockTo] = useState("15:30");
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [comment, setComment] = useState("");
  const [carKind, setCarKind] = useState<CarKind | "">("");
  const [kilometers, setKilometers] = useState("");
  const [travelComment, setTravelComment] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [pendingLines, setPendingLines] = useState<PendingProductLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof getDayTimesheetContext>> | null>(null);
  const [mode, setMode] = useState<"work" | "absence">(
    searchParams.get("mode") === "absence" ? "absence" : "work"
  );
  const [submittedNotice, setSubmittedNotice] = useState<{ hours: string; date: string } | null>(null);
  const [fromHits, setFromHits] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const [toHits, setToHits] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const [fromPoint, setFromPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [toPoint, setToPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [syncingProjects, setSyncingProjects] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  async function reloadDay(nextDate = date, nextProjectId = projectId) {
    const res = await getDayTimesheetContext(nextDate, nextProjectId || undefined);
    setCtx(res);
    if (res.success) {
      // Neste blokk starter der forrige registrering sluttet (krav 7).
      const next = nextDefaultClock({
        entries: res.data.entries,
        dayStartHour: res.data.dayStartHour,
        dayEndHour: res.data.dayEndHour,
        lunchMinutes: res.data.lunchMinutes,
      });
      setLunchMinutes(next.lunchMinutes);
      setClockFrom(next.clockFrom);
      setClockTo(next.clockTo);
      const activeIds = new Set(res.data.projects.map((p: { id: string }) => p.id));
      if (nextProjectId && !activeIds.has(nextProjectId)) {
        setProjectId("");
      } else if (!nextProjectId && res.data.suggestedProjectId && activeIds.has(res.data.suggestedProjectId)) {
        setProjectId(res.data.suggestedProjectId);
      }
    }
  }

  async function onSyncProjects() {
    setSyncingProjects(true);
    const res = await syncTimesheetProjectsNow();
    setSyncingProjects(false);
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: t("projectsSynced") });
    await reloadDay();
  }

  useEffect(() => {
    reloadDay(date, searchParams.get("projectId") || projectId);
    setSubmittedNotice(null);
    // Datoen styrer innlastingen. Kladd i feltene beholdes når fanen bare skjules.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const projects: Array<PickableProject & { externalProjectId?: string | null }> = ctx?.success
    ? ctx.data.projects
    : [];
  const projectSyncError = ctx?.success ? ctx.data.projectSyncError : null;
  const entries: Entry[] = ctx?.success ? ctx.data.entries : [];
  const savedUsage: SavedUsage[] = ctx?.success ? ctx.data.usage ?? [] : [];
  const canCreateFieldProject = ctx?.success ? Boolean(ctx.data.canCreateFieldProject) : false;
  const assignedToday = ctx?.success ? ctx.data.assignedProjects ?? [] : [];
  const assignedIds = new Set<string>(assignedToday.map((p: { id: string }) => p.id));
  const commentPresets: string[] = ctx?.success ? ctx.data.commentPresets ?? [] : [];
  const accountingConnected = Boolean(ctx?.success && ctx.data.accountingConnected);
  const absenceProjectId = ctx?.success ? ctx.data.absenceProjectId : null;
  const parents = topLevelPickableProjects(projects);
  const rootProjectId = projectId ? pickerRootId(projects, projectId) : "";
  const rootProject = parents.find((p) => p.id === rootProjectId) ?? null;
  const children = rootProjectId ? childProjectsOf(projects, rootProjectId) : [];

  const statusLabel = useMemo(
    () => ({
      DRAFT: t("status.draft"),
      SUBMITTED: t("status.submitted"),
      APPROVED: t("status.approved"),
      REJECTED: t("status.rejected"),
      SYNCED: isEmployee ? t("status.approved") : t("status.synced"),
      SYNC_ERROR: isEmployee ? t("status.submitted") : t("status.syncError"),
      PENDING: t("status.submitted"),
      ERROR: isEmployee ? t("status.submitted") : t("status.syncError"),
    }),
    [isEmployee, t]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const km = Number(String(kilometers).replace(",", "."));
    if (kilometers.trim() && (Number.isNaN(km) || km <= 0)) {
      toast({ title: t("error"), description: t("travelKmInvalid"), variant: "destructive" });
      return;
    }
    if (km > 0 && !carKind) {
      toast({ title: t("error"), description: t("travelCarRequired"), variant: "destructive" });
      return;
    }
    if (km > 0 && (!fromAddress.trim() || !toAddress.trim())) {
      toast({ title: t("error"), description: t("fromAddress"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const usageLines: Array<{
      kind: "PRODUCT" | "MACHINE" | "KM";
      productExternalId: string;
      quantity: number;
      comment?: string;
      isPrivateCar?: boolean;
      carKind?: CarKind;
      fromAddress?: string;
      toAddress?: string;
    }> = pendingLines.map((line) => ({
      kind: line.kind,
      productExternalId: line.productExternalId,
      quantity: line.quantity,
      comment: line.comment,
    }));
    if (km > 0 && carKind) {
      usageLines.push({
        kind: "KM",
        productExternalId: "km",
        quantity: km,
        comment: travelComment.trim() || undefined,
        isPrivateCar: carKind === "PRIVATE",
        carKind,
        fromAddress: fromAddress.trim(),
        toAddress: toAddress.trim(),
      });
    }
    const res = await submitDayTimesheet({
      date,
      clockFrom,
      clockTo,
      lunchMinutes,
      projectId,
      comment,
      usageLines,
    });
    setLoading(false);
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    const hours = res.data.hours.toLocaleString(dateLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const submittedDate = new Date(`${res.data.date}T12:00:00`).toLocaleDateString(dateLocale);
    setSubmittedNotice({ hours, date: submittedDate });
    toast({
      title: t("saved"),
      description: t("savedDescription", { hours, date: submittedDate }),
      duration: 8000,
    });
    setComment("");
    setPendingLines([]);
    setKilometers("");
    setCarKind("");
    setTravelComment("");
    setFromAddress("");
    setToAddress("");
    setFromPoint(null);
    setToPoint(null);
    router.refresh();
    await queryClient.invalidateQueries({ queryKey: ["time-registration-week"] });
    await queryClient.invalidateQueries({ queryKey: ["time-registration"] });
    await reloadDay();
    requestAnimationFrame(() => {
      noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const absences = ctx?.success ? ctx.data.absences ?? [] : [];
  const canCreateAbsence = ctx?.success ? Boolean(ctx.data.canCreateAbsence) : false;

  return (
    <div className="space-y-4">
      {submittedNotice && (
        <div
          ref={noticeRef}
          role="status"
          className="rounded-lg border-2 border-green-600 bg-green-50 p-4 text-green-950"
        >
          <p className="flex items-start gap-2 text-base font-semibold">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            {t("saved")}
          </p>
          <p className="mt-1 pl-7 text-sm">
            {t("savedDescription", {
              hours: submittedNotice.hours,
              date: submittedNotice.date,
            })}
          </p>
        </div>
      )}

      {canCreateAbsence && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "work" ? "default" : "outline"}
            className={mode === "work" ? "" : "bg-transparent"}
            onClick={() => setMode("work")}
          >
            {t("modes.work")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "absence" ? "default" : "outline"}
            className={mode === "absence" ? "" : "bg-transparent"}
            onClick={() => setMode("absence")}
          >
            {t("modes.absence")}
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <Label>{t("date")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {assignedToday.length > 0 && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <p className="text-sm font-medium">{t("assignedToday")}</p>
            {assignedToday.map((p: { id: string; name: string; plannedHours: number | null }) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => setProjectId(p.id)}
              >
                <span className="truncate">{p.name}</span>
                {p.plannedHours != null ? (
                  <span className="text-xs text-muted-foreground shrink-0">{p.plannedHours} t</span>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">{t("assignedLabel")}</span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {absences.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">{t("absence.today")}</p>
          {absences.map((a: { id: string; type: string; percentage: number; status: string }) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <p className="text-sm font-medium">
                  {t(`absence.types.${a.type}` as "absence.types.SELF_CERTIFIED")}
                  {a.percentage < 100 ? ` · ${a.percentage} %` : ""}
                </p>
                <Badge variant="outline" className="bg-transparent">
                  {statusLabel[a.status as keyof typeof statusLabel] ?? a.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {mode === "absence" && canCreateAbsence ? (
        <DayAbsenceForm
          date={date}
          projects={projects}
          absenceProjectId={absenceProjectId}
          onSaved={() => reloadDay()}
        />
      ) : (
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{t("from")}</Label>
            <Input type="time" required value={clockFrom} onChange={(e) => setClockFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("to")}</Label>
            <Input type="time" required value={clockTo} onChange={(e) => setClockTo(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>{t("lunch")}</Label>
          <Input
            type="number"
            min={0}
            value={lunchMinutes}
            onChange={(e) => setLunchMinutes(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>{t("project")}</Label>
            <div className="flex gap-2">
              {accountingConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  onClick={onSyncProjects}
                  disabled={syncingProjects}
                >
                  <RefreshCw className={`mr-1 h-4 w-4 ${syncingProjects ? "animate-spin" : ""}`} />
                  {syncingProjects ? t("syncingProjects") : t("syncProjects")}
                </Button>
              )}
              {canCreateFieldProject ? (
                <NewFieldJobDialog
                  isEmployee={isEmployee}
                  triggerLabel={t("newProject")}
                  parentProject={rootProject ? { id: rootProject.id, name: rootProject.name } : null}
                  onCreated={async (project) => {
                    setProjectId(project.id);
                    await reloadDay(date, project.id);
                  }}
                />
              ) : null}
            </div>
          </div>
          {projectSyncError && !isEmployee && (
            <p className="text-xs text-amber-700">
              {t("projectSyncFailed")}: {projectSyncError}
            </p>
          )}
          {parents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isEmployee && !canCreateFieldProject
                ? t("noProjectsEmployeeLocked")
                : isEmployee
                  ? t("noProjectsEmployee")
                  : t("noProjects")}
            </p>
          ) : (
            <ProjectPicker
              projects={projects}
              value={rootProjectId}
              onChange={setProjectId}
              assignedIds={assignedIds}
              showSyncBadge={!isEmployee}
              accountingConnected={accountingConnected}
            />
          )}
        </div>
        {children.length > 0 && (
          <div className="space-y-1">
            <Label>{t("subproject")}</Label>
            <select
              className="h-11 w-full rounded-md border bg-transparent px-3 text-sm"
              value={children.some((c) => c.id === projectId) ? projectId : ""}
              onChange={(e) => setProjectId(e.target.value || rootProjectId)}
            >
              <option value="">{t("mainProject")}</option>
              {children.map((p) => (
                <option key={p.id} value={p.id}>
                  {[p.code, p.name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <Label>{t("comment")} *</Label>
          {commentPresets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {commentPresets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => setComment(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          )}
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">{t("travel")}</p>
            <p className="text-xs text-muted-foreground">{t("travelHelp")}</p>
            <div className="flex gap-2">
              {(["COMPANY", "PRIVATE"] as const).map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  size="sm"
                  variant={carKind === kind ? "default" : "outline"}
                  className={carKind === kind ? "" : "bg-transparent"}
                  onClick={() => setCarKind(kind)}
                >
                  {kind === "PRIVATE" ? t("privateCar") : t("companyCar")}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="timesheet-km">{t("kilometers")}</Label>
              <Input
                id="timesheet-km"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={kilometers}
                onChange={(e) => setKilometers(e.target.value)}
                placeholder={t("kilometersPlaceholder")}
              />
            </div>
            <AddressField
              label={t("fromAddress")}
              value={fromAddress}
              hits={fromHits}
              onChange={(value) => {
                setFromAddress(value);
                setFromPoint(null);
                if (value.trim().length < 3) {
                  setFromHits([]);
                  return;
                }
                searchGeonorgeAddresses(value).then(setFromHits);
              }}
              onPick={(hit) => {
                setFromAddress(hit.label);
                setFromPoint({ lat: hit.lat, lon: hit.lon });
                setFromHits([]);
              }}
            />
            <AddressField
              label={t("toAddress")}
              value={toAddress}
              hits={toHits}
              onChange={(value) => {
                setToAddress(value);
                setToPoint(null);
                if (value.trim().length < 3) {
                  setToHits([]);
                  return;
                }
                searchGeonorgeAddresses(value).then(setToHits);
              }}
              onPick={(hit) => {
                setToAddress(hit.label);
                setToPoint({ lat: hit.lat, lon: hit.lon });
                setToHits([]);
              }}
            />
            {fromPoint && toPoint && (
              <iframe
                title={t("travel")}
                className="h-40 w-full rounded-md border"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(fromPoint.lon, toPoint.lon) - 0.02},${Math.min(fromPoint.lat, toPoint.lat) - 0.02},${Math.max(fromPoint.lon, toPoint.lon) + 0.02},${Math.max(fromPoint.lat, toPoint.lat) + 0.02}&layer=mapnik&marker=${fromPoint.lat},${fromPoint.lon}`}
              />
            )}
            <Input
              value={travelComment}
              onChange={(e) => setTravelComment(e.target.value)}
              placeholder={t("travelComment")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">{t("usage")}</p>
            <ProductLineEditor
              groups={ctx?.success ? (ctx.data.productGroups ?? []) : []}
              lines={pendingLines}
              onChange={setPendingLines}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-11" disabled={loading || !projectId}>
          {loading ? t("saving") : t("submitDay")}
        </Button>
      </form>
      )}

      {mode === "work" && (
      <div className="space-y-2">
        <p className="font-medium">{t("todayEntries")}</p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEntries")}</p>
        ) : (
          entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {e.hours} t · {e.project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.clockFrom}–{e.clockTo} · {e.comment}
                  </p>
                  {e.rejectionReason && (
                    <p className="text-xs text-red-600">{t("rejectedWith")}: {e.rejectionReason}</p>
                  )}
                </div>
                <Badge variant="outline" className="bg-transparent">
                  {statusLabel[e.approvalStatus as keyof typeof statusLabel] ?? e.approvalStatus}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
        {savedUsage.map((line) => (
          <Card key={line.id}>
            <CardContent className="flex items-center justify-between gap-2 py-3">
              <p className="flex items-center gap-2 text-sm">
                <UsageIcon kind={line.kind} className="h-4 w-4" />
                {line.kind === "KM"
                  ? `${t("travel")} · ${line.quantity} km · ${line.isPrivateCar ? t("privateCar") : t("companyCar")}`
                  : `${line.productName} · ${line.quantity}`}
              </p>
              <Badge variant="outline" className="bg-transparent">
                {statusLabel[line.syncStatus as keyof typeof statusLabel] ?? line.syncStatus}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

export function AfterRegisterComment({
  id,
  initial,
}: {
  id: string;
  initial: string;
}) {
  const t = useTranslations("timesheet");
  const { toast } = useToast();
  const [value, setValue] = useState(initial);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="bg-transparent"
      onClick={async () => {
        const res = await updateOwnTimesheetEntry(id, { comment: value });
        toast({
          title: res.success ? t("saved") : t("error"),
          description: res.success ? undefined : res.error,
          variant: res.success ? "default" : "destructive",
        });
      }}
    >
      {t("saveComment")}
    </Button>
  );
}

function AddressField({
  label,
  value,
  hits,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  hits: Array<{ label: string; lat: number; lon: number }>;
  onChange: (value: string) => void;
  onPick: (hit: { label: string; lat: number; lon: number }) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} />
      {hits.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {hits.map((hit) => (
            <button
              key={hit.label}
              type="button"
              className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onPick(hit)}
            >
              {hit.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
