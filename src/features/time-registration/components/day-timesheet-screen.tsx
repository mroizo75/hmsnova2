"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Car, CheckCircle2, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  addUsageToDay,
  getDayTimesheetContext,
  searchTimesheetProducts,
  submitDayTimesheet,
  updateOwnTimesheetEntry,
} from "@/server/actions/timesheet.actions";
import { hoursToClock } from "@/lib/time/split-day";
import { DayAbsenceForm } from "./day-absence-form";
import { NewFieldJobDialog } from "@/features/jobs/components/new-field-job-dialog";

type Product = {
  externalId: string;
  name: string;
  number: string | null;
  unit: string | null;
  categoryName: string | null;
};

type UsageKind = "PRODUCT" | "MACHINE";
type CarKind = "COMPANY" | "PRIVATE";

type PendingLine = {
  kind: UsageKind;
  productExternalId: string;
  quantity: number;
  name: string;
  unit: string | null;
  comment?: string;
};

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
  const [productQuery, setProductQuery] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState("1");
  const [lineComment, setLineComment] = useState("");
  const [usageKind, setUsageKind] = useState<UsageKind>("PRODUCT");
  const [carKind, setCarKind] = useState<CarKind | "">("");
  const [kilometers, setKilometers] = useState("");
  const [travelComment, setTravelComment] = useState("");
  const [pendingLines, setPendingLines] = useState<PendingLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof getDayTimesheetContext>> | null>(null);
  const [mode, setMode] = useState<"work" | "absence">(
    searchParams.get("mode") === "absence" ? "absence" : "work"
  );
  const [submittedNotice, setSubmittedNotice] = useState<{ hours: string; date: string } | null>(null);
  const [afterQty, setAfterQty] = useState("1");
  const [afterKm, setAfterKm] = useState("");
  const [afterCarKind, setAfterCarKind] = useState<CarKind | "">("");
  const noticeRef = useRef<HTMLDivElement>(null);

  async function reloadDay(nextDate = date, nextProjectId = projectId) {
    const res = await getDayTimesheetContext(nextDate, nextProjectId || undefined);
    setCtx(res);
    if (res.success) {
      setLunchMinutes(res.data.lunchMinutes);
      setClockFrom(hoursToClock(res.data.dayStartHour));
      setClockTo(hoursToClock(res.data.dayEndHour));
      if (!nextProjectId && res.data.suggestedProjectId) {
        setProjectId(res.data.suggestedProjectId);
      }
    }
  }

  useEffect(() => {
    reloadDay(date, searchParams.get("projectId") || projectId);
    setSubmittedNotice(null);
  }, [date]);

  useEffect(() => {
    const q = productQuery.trim();
    const handle = setTimeout(() => {
      searchTimesheetProducts(q, productCategory || null).then(setProducts);
    }, 200);
    return () => clearTimeout(handle);
  }, [productQuery, productCategory]);

  const projects = ctx?.success ? ctx.data.projects : [];
  const entries: Entry[] = ctx?.success ? ctx.data.entries : [];
  const savedUsage: SavedUsage[] = ctx?.success ? ctx.data.usage ?? [] : [];
  const customers = ctx?.success ? ctx.data.customers ?? [] : [];
  const canCreateFieldProject = ctx?.success ? Boolean(ctx.data.canCreateFieldProject) : false;
  const assignedToday = ctx?.success ? ctx.data.assignedProjects ?? [] : [];
  const assignedIds = new Set(assignedToday.map((p: { id: string }) => p.id));
  const commentPresets: string[] = ctx?.success ? ctx.data.commentPresets ?? [] : [];
  const productCategories: string[] = ctx?.success ? ctx.data.productCategories ?? [] : [];
  const accountingConnected = Boolean(ctx?.success && ctx.data.accountingConnected);
  const absenceProjectId = ctx?.success ? ctx.data.absenceProjectId : null;
  const parents = projects.filter((p: { parentId: string | null }) => !p.parentId);
  const assignedParents = parents.filter((p: { id: string }) => assignedIds.has(p.id));
  const otherParents = parents.filter((p: { id: string }) => !assignedIds.has(p.id));
  const children = projects.filter((p: { parentId: string | null }) => p.parentId === projectId);
  const hasSubmittedDay = entries.some((e) => e.approvalStatus !== "DRAFT");

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

  function addPendingLine() {
    if (!selectedProduct) return;
    setPendingLines((rows) => [
      ...rows,
      {
        kind: usageKind,
        productExternalId: selectedProduct.externalId,
        quantity: Number(qty),
        name: selectedProduct.name,
        unit: selectedProduct.unit,
        comment: lineComment.trim() || undefined,
      },
    ]);
    setLineComment("");
  }

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
    setLoading(true);
    const usageLines: Array<{
      kind: "PRODUCT" | "MACHINE" | "KM";
      productExternalId: string;
      quantity: number;
      comment?: string;
      isPrivateCar?: boolean;
      carKind?: CarKind;
    }> = pendingLines.map((l) => ({
      kind: l.kind,
      productExternalId: l.productExternalId,
      quantity: l.quantity,
      comment: l.comment,
    }));
    if (km > 0 && carKind) {
      usageLines.push({
        kind: "KM" as const,
        productExternalId: "km",
        quantity: km,
        comment: travelComment.trim() || undefined,
        isPrivateCar: carKind === "PRIVATE",
        carKind,
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
    router.refresh();
    await queryClient.invalidateQueries({ queryKey: ["time-registration-week"] });
    await queryClient.invalidateQueries({ queryKey: ["time-registration"] });
    await reloadDay();
    requestAnimationFrame(() => {
      noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function onAddUsageAfter() {
    if (!projectId) return;
    const res = await addUsageToDay({
      date,
      projectId,
      kind: usageKind,
      productExternalId: selectedProduct?.externalId ?? "",
      quantity: Number(afterQty),
      comment: lineComment.trim() || undefined,
    });
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: t("usageAdded") });
    setLineComment("");
    await reloadDay();
  }

  async function onAddTravelAfter() {
    if (!projectId) return;
    const km = Number(String(afterKm).replace(",", "."));
    if (Number.isNaN(km) || km <= 0) {
      toast({ title: t("error"), description: t("travelKmInvalid"), variant: "destructive" });
      return;
    }
    if (!afterCarKind) {
      toast({ title: t("error"), description: t("travelCarRequired"), variant: "destructive" });
      return;
    }
    const res = await addUsageToDay({
      date,
      projectId,
      kind: "KM",
      productExternalId: "km",
      quantity: km,
      comment: travelComment.trim() || undefined,
      isPrivateCar: afterCarKind === "PRIVATE",
      carKind: afterCarKind,
    });
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: t("travelAdded") });
    setAfterKm("");
    setAfterCarKind("");
    setTravelComment("");
    await reloadDay();
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
      <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between gap-2">
            <Label>{t("project")}</Label>
            {canCreateFieldProject ? (
              <NewFieldJobDialog
                customers={customers}
                isEmployee={isEmployee}
                triggerLabel={t("newProject")}
                onCreated={async (project) => {
                  setProjectId(project.id);
                  await reloadDay(date, project.id);
                }}
              />
            ) : null}
          </div>
          {parents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isEmployee && !canCreateFieldProject
                ? t("noProjectsEmployeeLocked")
                : isEmployee
                  ? t("noProjectsEmployee")
                  : t("noProjects")}
            </p>
          ) : (
            <select
              required
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">{t("selectProject")}</option>
              {assignedParents.length > 0 ? (
                <optgroup label={t("assignedToday")}>
                  {assignedParents.map((p: { id: string; name: string; clientName: string | null }) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.clientName ? ` · ${p.clientName}` : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {otherParents.length > 0 ? (
                <optgroup label={assignedParents.length > 0 ? t("otherProjects") : t("project")}>
                  {otherParents.map((p: { id: string; name: string; clientName: string | null; externalProjectId?: string | null }) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.clientName ? ` · ${p.clientName}` : ""}
                      {!isEmployee &&
                        (p.externalProjectId
                          ? ` · ${t("inTripletex")}`
                          : accountingConnected
                            ? ` · ${t("notInTripletex")}`
                            : "")}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          )}
        </div>
        {children.length > 0 && (
          <div className="space-y-1">
            <Label>{t("subproject")}</Label>
            <select
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              value={children.some((c: { id: string }) => c.id === projectId) ? projectId : ""}
              onChange={(e) => {
                if (e.target.value) setProjectId(e.target.value);
              }}
            >
              <option value="">{t("mainProject")}</option>
              {children.map((p: { id: string; name: string }) => (
                <option key={p.id} value={p.id}>
                  {p.name}
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
          <Textarea required minLength={2} value={comment} onChange={(e) => setComment(e.target.value)} />
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
            <div className="flex gap-2">
              {(["PRODUCT", "MACHINE"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={usageKind === k ? "default" : "outline"}
                  className={usageKind === k ? "" : "bg-transparent"}
                  onClick={() => setUsageKind(k)}
                >
                  <UsageIcon kind={k} className="mr-1 h-4 w-4" />
                  {t(`kind.${k}`)}
                </Button>
              ))}
            </div>
            {productCategories.length > 0 && (
              <select
                className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
              >
                <option value="">{t("allCategories")}</option>
                {productCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <Input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder={t("productSearch")}
            />
            <div className="space-y-1">
              {products.slice(0, 8).map((p) => (
                <button
                  key={p.externalId}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedProduct?.externalId === p.externalId ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedProduct(p)}
                >
                  <span className="font-medium">{p.name}</span>
                  {p.number ? ` · ${p.number}` : ""}
                  {p.unit ? ` · ${p.unit}` : ""}
                </button>
              ))}
            </div>
            <Input
              value={lineComment}
              onChange={(e) => setLineComment(e.target.value)}
              placeholder={t("lineComment")}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Button type="button" variant="outline" className="bg-transparent" onClick={addPendingLine}>
                {t("addLine")}
              </Button>
            </div>
            {pendingLines.map((l, i) => (
              <p key={`${l.productExternalId}-${i}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsageIcon kind={l.kind} className="h-4 w-4" />
                {l.name} · {l.quantity} {l.unit}
                {l.comment ? ` · ${l.comment}` : ""}
              </p>
            ))}
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
        {hasSubmittedDay && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">{t("addUsageAfter")}</p>
            <div className="space-y-2">
              <p className="text-xs font-medium">{t("travel")}</p>
              <div className="flex flex-wrap gap-2">
                {(["COMPANY", "PRIVATE"] as const).map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={afterCarKind === kind ? "default" : "outline"}
                    className={afterCarKind === kind ? "" : "bg-transparent"}
                    onClick={() => setAfterCarKind(kind)}
                  >
                    {kind === "PRIVATE" ? t("privateCar") : t("companyCar")}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0.01"
                  step="1"
                  value={afterKm}
                  onChange={(e) => setAfterKm(e.target.value)}
                  placeholder={t("kilometers")}
                />
                <Button type="button" variant="outline" className="bg-transparent" onClick={onAddTravelAfter}>
                  {t("addTravel")}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input type="number" min="0.01" step="0.01" value={afterQty} onChange={(e) => setAfterQty(e.target.value)} />
              <Button type="button" variant="outline" className="bg-transparent" onClick={onAddUsageAfter}>
                {t("addLine")}
              </Button>
            </div>
          </div>
        )}
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
  const [value, setValue] = useState(initial);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="bg-transparent"
      onClick={async () => {
        await updateOwnTimesheetEntry(id, { comment: value });
      }}
    >
      {t("saveComment")}
    </Button>
  );
}
