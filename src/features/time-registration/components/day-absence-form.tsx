"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createAbsence } from "@/server/actions/absence.actions";
import type { AbsenceType } from "@prisma/client";

const EMPLOYEE_TYPES: AbsenceType[] = [
  "SELF_CERTIFIED",
  "SICK_LEAVE",
  "CARE_DAYS",
  "VACATION",
  "COMPENSATORY",
  "LEAVE_OF_ABSENCE",
  "PARENTAL_LEAVE",
  "BEREAVEMENT",
  "MILITARY",
  "OTHER",
];

interface DayAbsenceFormProps {
  date: string;
  onSaved: () => Promise<void> | void;
}

export function DayAbsenceForm({ date, onSaved }: DayAbsenceFormProps) {
  const t = useTranslations("timesheet.absence");
  const { toast } = useToast();
  const [type, setType] = useState<AbsenceType>("SELF_CERTIFIED");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [percentage, setPercentage] = useState("100");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStartDate(date);
    setEndDate(date);
  }, [date]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createAbsence({
      type,
      startDate,
      endDate,
      percentage: Number(percentage) || 100,
      reason: reason.trim() || undefined,
    });
    setLoading(false);
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: t("saved") });
    setReason("");
    await onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("legal")}</p>
      <div className="space-y-1">
        <Label htmlFor="absence-type">{t("type")}</Label>
        <select
          id="absence-type"
          required
          className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as AbsenceType)}
        >
          {EMPLOYEE_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="absence-start">{t("from")}</Label>
          <Input
            id="absence-start"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="absence-end">{t("to")}</Label>
          <Input
            id="absence-end"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="absence-pct">{t("percentage")}</Label>
        <Input
          id="absence-pct"
          type="number"
          min={1}
          max={100}
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("percentageHelp")}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="absence-note">{t("note")}</Label>
        <Textarea
          id="absence-note"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("notePlaceholder")}
        />
      </div>
      {type === "SELF_CERTIFIED" && <p className="text-xs text-muted-foreground">{t("selfCertifiedHelp")}</p>}
      {type === "SICK_LEAVE" && <p className="text-xs text-muted-foreground">{t("sickLeaveHelp")}</p>}
      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? t("saving") : t("submit")}
      </Button>
    </form>
  );
}
