"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Banknote, Car, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTimeRegistrationConfig } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { hoursToClock, parseClockToHours, weekdayNormHours } from "@/lib/time/split-day";

export type CompanyTimePayrollConfig = {
  timeRegistrationEnabled: boolean;
  weeklyHoursNorm: number;
  lunchBreakMinutes: number;
  dayStartHour: number;
  dayEndHour: number;
  overtime50CapHours: number;
  saturdayOt50UntilHour: number;
  useOvertime40Percent: boolean;
  defaultKmRate: number;
  kmAllowanceTaxable: boolean;
  defaultHourlyRate: number | null;
  approximateTaxPercent: number | null;
};

interface CompanyTimePayrollSettingsProps {
  tenantId: string;
  isAdmin: boolean;
  config: CompanyTimePayrollConfig;
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function CompanyTimePayrollSettings({
  tenantId,
  isAdmin,
  config,
}: CompanyTimePayrollSettingsProps) {
  const t = useTranslations("dashboardSettingsPage.payroll");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(config.timeRegistrationEnabled);
  const [weeklyNorm, setWeeklyNorm] = useState(config.weeklyHoursNorm === 40 ? "40" : "37.5");
  const [lunch, setLunch] = useState(String(config.lunchBreakMinutes));
  const [clockFrom, setClockFrom] = useState(hoursToClock(config.dayStartHour));
  const [clockTo, setClockTo] = useState(hoursToClock(config.dayEndHour));
  const [ot50Cap, setOt50Cap] = useState(String(config.overtime50CapHours));
  const [saturdayUntil, setSaturdayUntil] = useState(hoursToClock(config.saturdayOt50UntilHour));
  const [overtime40, setOvertime40] = useState(config.useOvertime40Percent);
  const [kmRate, setKmRate] = useState(String(config.defaultKmRate));
  const [kmTaxable, setKmTaxable] = useState(config.kmAllowanceTaxable);
  const [hourlyRate, setHourlyRate] = useState(
    config.defaultHourlyRate != null ? String(config.defaultHourlyRate) : ""
  );
  const [taxPercent, setTaxPercent] = useState(
    config.approximateTaxPercent != null ? String(config.approximateTaxPercent) : ""
  );

  useEffect(() => {
    setEnabled(config.timeRegistrationEnabled);
    setWeeklyNorm(config.weeklyHoursNorm === 40 ? "40" : "37.5");
    setLunch(String(config.lunchBreakMinutes));
    setClockFrom(hoursToClock(config.dayStartHour));
    setClockTo(hoursToClock(config.dayEndHour));
    setOt50Cap(String(config.overtime50CapHours));
    setSaturdayUntil(hoursToClock(config.saturdayOt50UntilHour));
    setOvertime40(config.useOvertime40Percent);
    setKmRate(String(config.defaultKmRate));
    setKmTaxable(config.kmAllowanceTaxable);
    setHourlyRate(config.defaultHourlyRate != null ? String(config.defaultHourlyRate) : "");
    setTaxPercent(config.approximateTaxPercent != null ? String(config.approximateTaxPercent) : "");
  }, [config]);

  const lunchVal = parseInt(lunch, 10);
  const fromHour = parseClockToHours(clockFrom);
  const toHour = parseClockToHours(clockTo);
  const netDay =
    fromHour != null && toHour != null && Number.isFinite(lunchVal)
      ? weekdayNormHours({
          dayStartHour: fromHour,
          dayEndHour: toHour,
          overtime50CapHours: 0,
          saturdayOt50UntilHour: 0,
          lunchMinutes: lunchVal,
        })
      : null;
  const expectedDay = weeklyNorm === "40" ? 8 : 7.5;
  const normMismatch = netDay != null && Math.abs(netDay - expectedDay) > 0.05;

  const disableFields = !isAdmin || loading;

  const save = async (payload: Parameters<typeof updateTimeRegistrationConfig>[1]) => {
    if (!isAdmin) return false;
    setLoading(true);
    try {
      const res = await updateTimeRegistrationConfig(tenantId, payload);
      if (!res.success) throw new Error(res.error);
      toast({ title: t("saved") });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["time-registration"] });
      router.refresh();
      return true;
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (next: boolean) => {
    const prev = enabled;
    setEnabled(next);
    const ok = await save({ timeRegistrationEnabled: next });
    if (!ok) setEnabled(prev);
  };

  const handleSaveWork = async () => {
    if (isNaN(lunchVal) || lunchVal < 0 || lunchVal > 480) {
      toast({ variant: "destructive", title: t("invalidLunch") });
      return;
    }
    if (fromHour == null || toHour == null || toHour <= fromHour) {
      toast({ variant: "destructive", title: t("invalidClock") });
      return;
    }
    const cap = parseDecimal(ot50Cap);
    if (cap == null || cap < 0 || cap > 12) {
      toast({ variant: "destructive", title: t("invalidOt50") });
      return;
    }
    const satHour = parseClockToHours(saturdayUntil);
    if (satHour == null) {
      toast({ variant: "destructive", title: t("invalidSaturday") });
      return;
    }
    await save({
      weeklyHoursNorm: weeklyNorm === "40" ? 40 : 37.5,
      lunchBreakMinutes: lunchVal,
      dayStartHour: fromHour,
      dayEndHour: toHour,
      overtime50CapHours: cap,
      saturdayOt50UntilHour: satHour,
      useOvertime40Percent: overtime40,
    });
  };

  const handleSaveKm = async () => {
    const kmVal = parseDecimal(kmRate);
    if (kmVal == null || kmVal < 0 || kmVal > 100) {
      toast({ variant: "destructive", title: t("invalidKm") });
      return;
    }
    await save({
      defaultKmRate: kmVal,
      kmAllowanceTaxable: kmTaxable,
    });
  };

  const handleSaveEstimate = async () => {
    const rateVal = hourlyRate.trim() ? parseDecimal(hourlyRate) : null;
    const taxVal = taxPercent.trim() ? parseDecimal(taxPercent) : null;
    if (rateVal != null && (rateVal < 0 || rateVal > 9999)) {
      toast({ variant: "destructive", title: t("invalidRate") });
      return;
    }
    if (taxVal != null && (taxVal < 0 || taxVal > 100)) {
      toast({ variant: "destructive", title: t("invalidTax") });
      return;
    }
    await save({
      defaultHourlyRate: rateVal,
      approximateTaxPercent: taxVal,
    });
  };

  const netLabel = useMemo(() => {
    if (netDay == null) return null;
    return t("netDay", { hours: String(netDay).replace(".", ",") });
  }, [netDay, t]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("enableTitle")}</CardTitle>
          <CardDescription>{t("enableDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="time-reg-enabled"
              checked={enabled}
              disabled={disableFields}
              onCheckedChange={handleEnable}
            />
            <Label htmlFor="time-reg-enabled">{t("enableLabel")}</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            {t("workTitle")}
          </CardTitle>
          <CardDescription>{t("workLegal")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs">{t("weeklyNorm")}</Label>
            <Select value={weeklyNorm} onValueChange={setWeeklyNorm} disabled={disableFields}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="37.5">{t("weekly375")}</SelectItem>
                <SelectItem value="40">{t("weekly40")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label className="text-xs" htmlFor="day-start">
                {t("dayStart")}
              </Label>
              <Input
                id="day-start"
                type="time"
                step={60}
                value={clockFrom}
                disabled={disableFields}
                onChange={(e) => setClockFrom(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs" htmlFor="day-end">
                {t("dayEnd")}
              </Label>
              <Input
                id="day-end"
                type="time"
                step={60}
                value={clockTo}
                disabled={disableFields}
                onChange={(e) => setClockTo(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs" htmlFor="lunch-min">
                {t("lunch")}
              </Label>
              <Input
                id="lunch-min"
                type="number"
                min={0}
                max={480}
                value={lunch}
                disabled={disableFields}
                onChange={(e) => setLunch(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          {netLabel && (
            <p className={`text-xs ${normMismatch ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
              {netLabel}
              {normMismatch ? ` ${t("normMismatch", { expected: String(expectedDay).replace(".", ",") })}` : ""}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs" htmlFor="ot50-cap">
                {t("ot50Cap")}
              </Label>
              <Input
                id="ot50-cap"
                type="text"
                inputMode="decimal"
                value={ot50Cap}
                disabled={disableFields}
                onChange={(e) => setOt50Cap(e.target.value)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">{t("ot50CapHelp")}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs" htmlFor="sat-until">
                {t("saturdayUntil")}
              </Label>
              <Input
                id="sat-until"
                type="time"
                step={60}
                value={saturdayUntil}
                disabled={disableFields}
                onChange={(e) => setSaturdayUntil(e.target.value)}
                className="w-36"
              />
              <p className="text-xs text-muted-foreground">{t("saturdayUntilHelp")}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overtime40"
              checked={overtime40}
              disabled={disableFields}
              onCheckedChange={(c) => setOvertime40(!!c)}
            />
            <Label htmlFor="overtime40" className="text-xs font-normal cursor-pointer">
              {t("overtime40")}
            </Label>
          </div>
          <Button size="sm" onClick={handleSaveWork} disabled={disableFields}>
            {loading ? t("saving") : t("saveWork")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5" />
            {t("kmTitle")}
          </CardTitle>
          <CardDescription>{t("kmLegal")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs" htmlFor="km-rate">
              {t("kmRate")}
            </Label>
            <Input
              id="km-rate"
              type="text"
              inputMode="decimal"
              value={kmRate}
              disabled={disableFields}
              onChange={(e) => setKmRate(e.target.value)}
              placeholder="5.30"
              className="w-24"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="km-taxable" className="text-sm">
                {t("kmTaxable")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("kmTaxableHelp")}</p>
            </div>
            <Switch
              id="km-taxable"
              checked={kmTaxable}
              disabled={disableFields}
              onCheckedChange={setKmTaxable}
            />
          </div>
          <Button size="sm" onClick={handleSaveKm} disabled={disableFields}>
            {loading ? t("saving") : t("saveKm")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5" />
            {t("estimateTitle")}
          </CardTitle>
          <CardDescription>{t("estimateLegal")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs" htmlFor="hourly-rate">
              {t("hourlyRate")}
            </Label>
            <Input
              id="hourly-rate"
              type="text"
              inputMode="decimal"
              value={hourlyRate}
              disabled={disableFields}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder={t("hourlyRatePlaceholder")}
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">{t("hourlyRateHelp")}</p>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs" htmlFor="tax-percent">
              {t("taxPercent")}
            </Label>
            <Input
              id="tax-percent"
              type="text"
              inputMode="decimal"
              value={taxPercent}
              disabled={disableFields}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder="25"
              className="w-20"
            />
            <p className="text-xs text-muted-foreground">{t("taxPercentHelp")}</p>
          </div>
          <Button size="sm" onClick={handleSaveEstimate} disabled={disableFields}>
            {loading ? t("saving") : t("saveEstimate")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
