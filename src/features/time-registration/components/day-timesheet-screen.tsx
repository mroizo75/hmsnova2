"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { nextDefaultClock } from "@/lib/time/split-day";
import type { getDayTimesheetContext } from "@/server/actions/timesheet.actions";
import {
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
import { RouteMap } from "./route-map";

type CarKind = "COMPANY" | "PRIVATE";
type AddressHit = { id: string; label: string; lat: number; lon: number };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DayTimesheetScreen({
  isEmployee = false,
  initialDate,
  initialProjectId = "",
  initialMode = "work",
  active = true,
}: {
  isEmployee?: boolean;
  initialDate?: string;
  initialProjectId?: string;
  initialMode?: "work" | "absence";
  active?: boolean;
}) {
  const t = useTranslations("timesheet");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "nb-NO";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [date, setDate] = useState(initialDate || todayIso());
  const [clockFrom, setClockFrom] = useState("");
  const [clockTo, setClockTo] = useState("");
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [dayReady, setDayReady] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [comment, setComment] = useState("");
  const [carKind, setCarKind] = useState<CarKind>("COMPANY");
  const [ownServiceCar, setOwnServiceCar] = useState(false);
  const kmTouched = useRef(false);
  const [kilometers, setKilometers] = useState("");
  const [travelComment, setTravelComment] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [pendingLines, setPendingLines] = useState<PendingProductLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof getDayTimesheetContext>> | null>(null);
  const [mode, setMode] = useState<"work" | "absence">(initialMode);
  const [submittedNotice, setSubmittedNotice] = useState<{ hours: string; date: string } | null>(null);
  const [fromHits, setFromHits] = useState<AddressHit[]>([]);
  const [toHits, setToHits] = useState<AddressHit[]>([]);
  const [fromSearchNote, setFromSearchNote] = useState<"empty" | "error" | null>(null);
  const [toSearchNote, setToSearchNote] = useState<"empty" | "error" | null>(null);
  const [fromPoint, setFromPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [toPoint, setToPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<Array<{ lat: number; lon: number }>>([]);
  const [syncingProjects, setSyncingProjects] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const addressTimers = useRef<{ from?: ReturnType<typeof setTimeout>; to?: ReturnType<typeof setTimeout> }>({});
  const addressSeq = useRef({ from: 0, to: 0 });

  function scheduleAddressSearch(
    which: "from" | "to",
    value: string,
    setHits: (hits: AddressHit[]) => void,
    setNote: (note: "empty" | "error" | null) => void
  ) {
    if (addressTimers.current[which]) clearTimeout(addressTimers.current[which]);
    const query = value.trim();
    if (query.length < 3) {
      setHits([]);
      setNote(null);
      return;
    }
    const seq = ++addressSeq.current[which];
    addressTimers.current[which] = setTimeout(() => {
      const params = new URLSearchParams({ kind: "addresses", q: query });
      fetch(`/api/time-registration/live?${params}`)
        .then((response) => response.json())
        .then((hits: AddressHit[]) => {
          if (addressSeq.current[which] !== seq) return;
          const rows = Array.isArray(hits) ? hits : [];
          setHits(rows);
          setNote(rows.length === 0 ? "empty" : null);
        })
        .catch(() => {
          if (addressSeq.current[which] !== seq) return;
          setHits([]);
          setNote("error");
        });
    }, 300);
  }

  async function reloadDay(nextDate = date, nextProjectId = projectId) {
    setDayReady(false);
    const params = new URLSearchParams({ kind: "day", date: nextDate });
    if (nextProjectId) params.set("projectId", nextProjectId);
    const res = (await fetch(`/api/time-registration/live?${params}`).then((response) =>
      response.json()
    )) as Awaited<ReturnType<typeof getDayTimesheetContext>>;
    setCtx(res);
    if (res.success) {
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
      setDayReady(true);
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
    toast({
      title: t("projectsSynced"),
      description: t("syncResult", {
        customers: res.data.customers,
        products: res.data.products,
        projects: res.data.projects,
        contacts: res.data.contacts,
      }),
    });
    await reloadDay();
  }

  useEffect(() => {
    if (!fromPoint || !toPoint || kmTouched.current) return;
    let cancelled = false;
    const params = new URLSearchParams({
      kind: "route",
      fromLat: String(fromPoint.lat),
      fromLon: String(fromPoint.lon),
      toLat: String(toPoint.lat),
      toLon: String(toPoint.lon),
    });
    fetch(`/api/time-registration/live?${params}`)
      .then((response) => response.json())
      .then((res: { success?: boolean; data?: { km: number; points: Array<{ lat: number; lon: number }> } }) => {
        if (cancelled || !res.success || !res.data) return;
        setKilometers(String(res.data.km));
        setRoutePoints(res.data.points);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fromPoint, toPoint]);

  useEffect(() => {
    if (!active) return;
    reloadDay(date, projectId);
    setSubmittedNotice(null);
    // Ny visning av fanen henter dagen på nytt, så en lagret stempling ikke kan sendes inn igjen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, date]);

  const projects: Array<PickableProject & { externalProjectId?: string | null }> = ctx?.success
    ? ctx.data.projects
    : [];
  const projectSyncError = ctx?.success ? ctx.data.projectSyncError : null;
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
    const effectiveCarKind: CarKind = carKind === "COMPANY" && ownServiceCar ? "PRIVATE" : carKind;
    if (km > 0 && effectiveCarKind) {
      usageLines.push({
        kind: "KM",
        productExternalId: "km",
        quantity: km,
        comment: travelComment.trim() || undefined,
        isPrivateCar: effectiveCarKind === "PRIVATE",
        carKind: effectiveCarKind,
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
    setCarKind("COMPANY");
    setOwnServiceCar(false);
    setTravelComment("");
    setFromAddress("");
    setToAddress("");
    setFromPoint(null);
    setToPoint(null);
    setClockFrom(clockTo);
    setClockTo("");
    setLunchMinutes(0);
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
          <Label>{t("comment")}</Label>
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
              <Button
                type="button"
                size="sm"
                variant={carKind === "COMPANY" ? "default" : "outline"}
                className={carKind === "COMPANY" ? "" : "bg-transparent"}
                onClick={() => setCarKind("COMPANY")}
              >
                {t("companyCar")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={carKind === "PRIVATE" ? "default" : "outline"}
                className={carKind === "PRIVATE" ? "" : "bg-transparent"}
                onClick={() => {
                  setCarKind("PRIVATE");
                  setOwnServiceCar(false);
                }}
              >
                {t("privateCar")}
              </Button>
            </div>
            {carKind === "COMPANY" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ownServiceCar}
                  onChange={(e) => setOwnServiceCar(e.target.checked)}
                />
                {t("privateServiceCar")}
              </label>
            )}
            <p className="text-xs text-muted-foreground">{t("addressRegisterHint")}</p>
            <AddressField
              label={t("fromAddress")}
              value={fromAddress}
              hits={fromHits}
              note={fromSearchNote ? t(fromSearchNote === "empty" ? "addressSearchEmpty" : "addressSearchFailed") : null}
              onChange={(value) => {
                setFromAddress(value);
                setFromPoint(null);
                setRoutePoints([]);
                setFromSearchNote(null);
                scheduleAddressSearch("from", value, setFromHits, setFromSearchNote);
              }}
              onPick={(hit) => {
                kmTouched.current = false;
                setFromAddress(hit.label);
                setFromPoint({ lat: hit.lat, lon: hit.lon });
                setFromHits([]);
                setFromSearchNote(null);
              }}
            />
            <AddressField
              label={t("toAddress")}
              value={toAddress}
              hits={toHits}
              note={toSearchNote ? t(toSearchNote === "empty" ? "addressSearchEmpty" : "addressSearchFailed") : null}
              onChange={(value) => {
                setToAddress(value);
                setToPoint(null);
                setRoutePoints([]);
                setToSearchNote(null);
                scheduleAddressSearch("to", value, setToHits, setToSearchNote);
              }}
              onPick={(hit) => {
                kmTouched.current = false;
                setToAddress(hit.label);
                setToPoint({ lat: hit.lat, lon: hit.lon });
                setToHits([]);
                setToSearchNote(null);
              }}
            />
            {fromPoint && toPoint && (
              <RouteMap from={fromPoint} to={toPoint} path={routePoints} label={t("travelMap")} />
            )}
            <Input
              value={travelComment}
              onChange={(e) => setTravelComment(e.target.value)}
              placeholder={t("travelComment")}
            />
            <div className="space-y-1">
              <Label htmlFor="timesheet-km">{t("kilometers")}</Label>
              <Input
                id="timesheet-km"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={kilometers}
                onChange={(e) => {
                  kmTouched.current = true;
                  setKilometers(e.target.value);
                }}
                placeholder={t("kilometersPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("kilometersAuto")}</p>
            </div>
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

        <Button type="submit" className="w-full h-11" disabled={loading || !dayReady || !projectId || !clockTo}>
          {loading ? t("saving") : t("submitDay")}
        </Button>
      </form>
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
  note,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  hits: AddressHit[];
  note: string | null;
  onChange: (value: string) => void;
  onPick: (hit: AddressHit) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} autoComplete="off" />
      {hits.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {hits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onPick(hit)}
            >
              {hit.label}
            </button>
          ))}
        </div>
      )}
      {note && hits.length === 0 && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
