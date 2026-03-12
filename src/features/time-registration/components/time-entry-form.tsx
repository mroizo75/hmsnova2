"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTimeEntry } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Briefcase, Car, HeartPulse, HelpCircle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface TimeEntryFormProps {
  tenantId: string;
  projects: Project[];
  initialProjectId?: string;
  defaultDate?: Date;
  lunchBreakMinutes?: number;
  /** Fra denne klokken (man–fre) = 100 % overtid. Null = alt 50 % */
  eveningOvertimeFromHour?: number | null;
  /** Når satt: vis kun dette moduset uten flikvelger */
  forceMode?: "work" | "travel" | "sick";
}

export function TimeEntryForm({
  tenantId,
  projects,
  initialProjectId,
  defaultDate = new Date(),
  lunchBreakMinutes = 30,
  eveningOvertimeFromHour,
  forceMode,
}: TimeEntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"work" | "travel" | "sick">(forceMode ?? "work");
  useEffect(() => {
    if (forceMode) setMode(forceMode);
  }, [forceMode]);
  const [inputStyle, setInputStyle] = useState<"clock" | "fromTo">("clock");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [hours, setHours] = useState("7.5");
  const [fromTime, setFromTime] = useState("07:00");
  const [toTime, setToTime] = useState("15:00");
  const [lunchMin, setLunchMin] = useState(String(lunchBreakMinutes));
  useEffect(() => {
    setLunchMin(String(lunchBreakMinutes));
  }, [lunchBreakMinutes]);
  const [drivingM, setDrivingM] = useState("0");
  const [drivingE, setDrivingE] = useState("0");
  const [workedAfterEvening, setWorkedAfterEvening] = useState(false);
  const [comment, setComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(hours.replace(",", "."));
    if (!projectId) {
      toast({ variant: "destructive", title: "Velg prosjekt" });
      return;
    }
    if (mode !== "travel" && mode !== "sick" && inputStyle === "clock" && (isNaN(h) || h <= 0)) {
      toast({ variant: "destructive", title: "Fyll ut timer" });
      return;
    }
    setLoading(true);
    try {
      const payload: Parameters<typeof createTimeEntry>[0] = {
        tenantId,
        projectId,
        date: new Date(date),
        hours: h,
        mode,
        workedUntilHour:
          mode === "work" &&
          workedAfterEvening &&
          eveningOvertimeFromHour != null
            ? eveningOvertimeFromHour
            : undefined,
        comment: comment.trim() || undefined,
      };
      if (mode === "work" && inputStyle === "fromTo") {
        payload.fromToInput = {
          from: fromTime,
          to: toTime,
          lunchMinutes: parseInt(lunchMin, 10) || lunchBreakMinutes,
          drivingMorningMinutes: parseInt(drivingM, 10) || 0,
          drivingEveningMinutes: parseInt(drivingE, 10) || 0,
        };
      }
      const res = await createTimeEntry(payload);
      if (!res.success) throw new Error(res.error);
      toast({
        title:
          mode === "work"
            ? "Timer registrert (ordinær + overtid automatisk fordelt)"
            : mode === "sick"
              ? "Sykefravær registrert"
              : "Reisetid registrert",
      });
      router.refresh();
      setDate(format(new Date(), "yyyy-MM-dd"));
      setProjectId(initialProjectId ?? "");
      setHours(mode === "work" ? "8" : mode === "sick" ? "7.5" : "0.5");
      setComment("");
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (projects.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!forceMode && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as "work" | "travel" | "sick")}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="work" className="gap-1.5">
              <Briefcase className="h-4 w-4" />
              Arbeid
            </TabsTrigger>
            <TabsTrigger value="travel" className="gap-1.5">
              <Car className="h-4 w-4" />
              Reise
            </TabsTrigger>
            <TabsTrigger value="sick" className="gap-1.5">
              <HeartPulse className="h-4 w-4" />
              Sykefravær
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Dato</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prosjekt</Label>
          <Select value={projectId} onValueChange={setProjectId} required>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Velg prosjekt" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code ? `${p.code} – ` : ""}{p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mode === "work" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Registrering:</Label>
            <Tabs
              value={inputStyle}
              onValueChange={(v) => setInputStyle(v as "clock" | "fromTo")}
            >
              <TabsList className="h-8">
                <TabsTrigger value="clock" className="text-xs px-2">
                  Klokketimer
                </TabsTrigger>
                <TabsTrigger value="fromTo" className="text-xs px-2">
                  Fra/til
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
        {mode === "work" && inputStyle === "fromTo" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Fra</Label>
              <Input
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Til</Label>
              <Input
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lunsj (min)</Label>
              <Input
                type="number"
                min={0}
                max={480}
                value={lunchMin}
                onChange={(e) => setLunchMin(e.target.value)}
                className="w-16"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" title="Reise morgen (M.Driving)">
                Reise m. (min)
              </Label>
              <Input
                type="number"
                min={0}
                max={480}
                value={drivingM}
                onChange={(e) => setDrivingM(e.target.value)}
                className="w-16"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" title="Reise kveld (E.Driving)">
                Reise k. (min)
              </Label>
              <Input
                type="number"
                min={0}
                max={480}
                value={drivingE}
                onChange={(e) => setDrivingE(e.target.value)}
                className="w-16"
              />
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              {mode === "travel"
                ? "Reisetimer"
                : mode === "sick"
                  ? "Timer sykefravær"
                  : "Klokketimer"}
              {(mode === "work" || mode === "sick") && (
                <span
                  title={`8–16 = 8 t, 8–20 = 12 t. Lunsj (${lunchBreakMinutes} min) trekkes automatisk.`}
                  className="cursor-help inline-flex"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              )}
            </Label>
            <Input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={
                mode === "work" ? "8" : mode === "sick" ? "7.5" : "0.5"
              }
              className="w-20"
            />
          </div>
        )}
        {mode === "work" && eveningOvertimeFromHour != null && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="workedAfterEvening"
              checked={workedAfterEvening}
              onCheckedChange={(c) => setWorkedAfterEvening(!!c)}
            />
            <Label
              htmlFor="workedAfterEvening"
              className="text-xs font-normal cursor-pointer"
            >
              Arbeid etter kl {eveningOvertimeFromHour} (100 % overtid)
            </Label>
          </div>
        )}
        <div className="space-y-1 flex-1 min-w-[140px]">
          <Label className="text-xs">Kommentar</Label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Valgfritt"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "..." : "Registrer"}
        </Button>
      </div>
    </form>
  );
}
