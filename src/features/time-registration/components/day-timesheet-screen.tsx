"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getDayTimesheetContext,
  searchTimesheetProducts,
  submitDayTimesheet,
  updateOwnTimesheetEntry,
} from "@/server/actions/timesheet.actions";
import { hoursToClock } from "@/lib/time/split-day";
import { DayAbsenceForm } from "./day-absence-form";

type Product = {
  externalId: string;
  name: string;
  unit: string | null;
  categoryName: string | null;
};

type Entry = {
  id: string;
  hours: number;
  timeType: string;
  comment: string | null;
  approvalStatus: string;
  clockFrom: string | null;
  clockTo: string | null;
  project: { name: string };
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DayTimesheetScreen() {
  const t = useTranslations("timesheet");
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || todayIso());
  const [clockFrom, setClockFrom] = useState("07:00");
  const [clockTo, setClockTo] = useState("15:30");
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [comment, setComment] = useState("");
  const [salaryTypeId, setSalaryTypeId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState("1");
  const [usageKind, setUsageKind] = useState<"PRODUCT" | "MACHINE" | "KM">("PRODUCT");
  const [pendingLines, setPendingLines] = useState<
    Array<{ kind: "PRODUCT" | "MACHINE" | "KM"; productExternalId: string; quantity: number; name: string; unit: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof getDayTimesheetContext>> | null>(null);
  const [mode, setMode] = useState<"work" | "absence">(
    searchParams.get("mode") === "absence" ? "absence" : "work"
  );

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
  }, [date]);

  useEffect(() => {
    const q = productQuery.trim();
    const handle = setTimeout(() => {
      searchTimesheetProducts(q).then(setProducts);
    }, 200);
    return () => clearTimeout(handle);
  }, [productQuery]);

  const projects = ctx?.success ? ctx.data.projects : [];
  const entries: Entry[] = ctx?.success ? ctx.data.entries : [];
  const salaryTypes = ctx?.success ? ctx.data.salaryTypes : [];
  const parents = projects.filter((p: { parentId: string | null }) => !p.parentId);
  const children = projects.filter((p: { parentId: string | null }) => p.parentId === projectId);

  const statusLabel = useMemo(
    () => ({
      DRAFT: t("status.draft"),
      SUBMITTED: t("status.submitted"),
      APPROVED: t("status.approved"),
      REJECTED: t("status.rejected"),
      SYNCED: t("status.synced"),
      SYNC_ERROR: t("status.syncError"),
    }),
    [t]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await submitDayTimesheet({
      date,
      clockFrom,
      clockTo,
      lunchMinutes,
      projectId,
      comment,
      salaryTypeId: salaryTypeId || null,
      usageLines: pendingLines.map((l) => ({
        kind: l.kind,
        productExternalId: l.productExternalId,
        quantity: l.quantity,
      })),
    });
    setLoading(false);
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: t("saved") });
    setComment("");
    setPendingLines([]);
    router.refresh();
    await reloadDay();
  }

  const absences = ctx?.success ? ctx.data.absences ?? [] : [];
  const canCreateAbsence = ctx?.success ? Boolean(ctx.data.canCreateAbsence) : false;

  return (
    <div className="space-y-4">
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
        <DayAbsenceForm date={date} onSaved={() => reloadDay()} />
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
          <Label>{t("project")}</Label>
          <select
            required
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">{t("selectProject")}</option>
            {parents.map((p: { id: string; name: string; clientName: string | null }) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.clientName ? ` · ${p.clientName}` : ""}
              </option>
            ))}
          </select>
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
        {salaryTypes.length > 0 && (
          <div className="space-y-1">
            <Label>{t("salaryType")}</Label>
            <select
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              value={salaryTypeId}
              onChange={(e) => setSalaryTypeId(e.target.value)}
            >
              <option value="">{t("defaultSalaryType")}</option>
              {salaryTypes.map((s: { externalId: string; name: string }) => (
                <option key={s.externalId} value={s.externalId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <Label>{t("comment")} *</Label>
          <Textarea required minLength={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">{t("usage")}</p>
            <div className="flex gap-2">
              {(["PRODUCT", "MACHINE", "KM"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={usageKind === k ? "default" : "outline"}
                  className={usageKind === k ? "" : "bg-transparent"}
                  onClick={() => setUsageKind(k)}
                >
                  {t(`kind.${k}`)}
                </Button>
              ))}
            </div>
            {usageKind !== "KM" && (
              <>
                <Input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder={t("productSearch")}
                />
                <select
                  className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={selectedProduct?.externalId ?? ""}
                  onChange={(e) => {
                    const p = products.find((x) => x.externalId === e.target.value) ?? null;
                    setSelectedProduct(p);
                  }}
                >
                  <option value="">{t("selectProduct")}</option>
                  {products.map((p) => (
                    <option key={p.externalId} value={p.externalId}>
                      {p.name}
                      {p.unit ? ` (${p.unit})` : ""}
                    </option>
                  ))}
                </select>
                {selectedProduct?.unit && (
                  <p className="text-xs text-muted-foreground">
                    {t("unit")}: {selectedProduct.unit}
                  </p>
                )}
              </>
            )}
            <div className="flex gap-2">
              <Input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  if (usageKind !== "KM" && !selectedProduct) return;
                  setPendingLines((rows) => [
                    ...rows,
                    {
                      kind: usageKind,
                      productExternalId: selectedProduct?.externalId ?? "km",
                      quantity: Number(qty),
                      name: selectedProduct?.name ?? t("kind.KM"),
                      unit: selectedProduct?.unit ?? "km",
                    },
                  ]);
                }}
              >
                {t("addLine")}
              </Button>
            </div>
            {pendingLines.map((l, i) => (
              <p key={`${l.productExternalId}-${i}`} className="text-sm text-muted-foreground">
                {l.name} · {l.quantity} {l.unit}
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
                </div>
                <Badge variant="outline" className="bg-transparent">
                  {statusLabel[e.approvalStatus as keyof typeof statusLabel] ?? e.approvalStatus}
                </Badge>
              </CardContent>
            </Card>
          ))
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
