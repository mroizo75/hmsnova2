"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { updateTimeRegistrationConfig } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { Settings2 } from "lucide-react";

interface TimeRegistrationSettingsProps {
  tenantId: string;
  weeklyHoursNorm: number;
  lunchBreakMinutes: number;
  eveningOvertimeFromHour: number | null;
  useOvertime40Percent?: boolean;
  saturdayOvertime40LimitHours?: number | null;
}

export function TimeRegistrationSettings({
  tenantId,
  weeklyHoursNorm,
  lunchBreakMinutes,
  eveningOvertimeFromHour,
  useOvertime40Percent = false,
  saturdayOvertime40LimitHours,
}: TimeRegistrationSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lunch, setLunch] = useState(String(lunchBreakMinutes));
  const [weeklyNorm, setWeeklyNorm] = useState(
    weeklyHoursNorm === 40 ? "40" : "37.5"
  );
  const [overtime40, setOvertime40] = useState(!!useOvertime40Percent);
  const [saturdaySplit, setSaturdaySplit] = useState<string>(
    saturdayOvertime40LimitHours != null ? String(saturdayOvertime40LimitHours) : "__none__"
  );
  const [eveningHour, setEveningHour] = useState<string>(
    eveningOvertimeFromHour != null ? String(eveningOvertimeFromHour) : "__none__"
  );

  useEffect(() => {
    setLunch(String(lunchBreakMinutes));
  }, [lunchBreakMinutes]);
  useEffect(() => {
    setWeeklyNorm(weeklyHoursNorm === 40 ? "40" : "37.5");
  }, [weeklyHoursNorm]);
  useEffect(() => {
    setOvertime40(!!useOvertime40Percent);
  }, [useOvertime40Percent]);
  useEffect(() => {
    setEveningHour(
      eveningOvertimeFromHour != null ? String(eveningOvertimeFromHour) : "__none__"
    );
  }, [eveningOvertimeFromHour]);
  useEffect(() => {
    setSaturdaySplit(
      saturdayOvertime40LimitHours != null
        ? String(saturdayOvertime40LimitHours)
        : "__none__"
    );
  }, [saturdayOvertime40LimitHours]);

  const handleSave = async () => {
    const lunchVal = parseInt(lunch, 10);
    if (isNaN(lunchVal) || lunchVal < 0 || lunchVal > 480) {
      toast({ variant: "destructive", title: "Lunsj må være 0–480 minutter" });
      return;
    }
    const weeklyVal = weeklyNorm === "40" ? 40 : 37.5;
    setLoading(true);
    try {
      const res = await updateTimeRegistrationConfig(tenantId, {
        lunchBreakMinutes: lunchVal,
        weeklyHoursNorm: weeklyVal,
        useOvertime40Percent: overtime40,
        eveningOvertimeFromHour:
          eveningHour === "__none__" ? null : parseInt(eveningHour, 10),
        saturdayOvertime40LimitHours:
          saturdaySplit === "__none__"
            ? null
            : parseFloat(saturdaySplit),
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: "Innstillinger lagret" });
      router.refresh();
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Overtidsregler
        </CardTitle>
        <CardDescription>
          Definer hvordan overtid beregnes. Ansatt skriver kun timer og reise – systemet regner ut typen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-xs">Lunsj (min) – trekkes fra klokketimer</Label>
          <Input
            type="number"
            min={0}
            max={480}
            value={lunch}
            onChange={(e) => setLunch(e.target.value)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            8–16 = 8 t klokke − 30 min lunsj = 7,5 t. 8–20 = 12 t − 30 min = 11,5 t (7,5 ordinær + 4 overtid).
          </p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Daglig norm</Label>
          <Select value={weeklyNorm} onValueChange={setWeeklyNorm}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="37.5">7,5 t/dag (37,5 t/uke)</SelectItem>
              <SelectItem value="40">8 t/dag (40 t/uke)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Over norm = overtid. Standard 7,5 t – kunder med 8 t dag kan velge 40 t/uke.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="overtime40"
            checked={overtime40}
            onCheckedChange={(c) => setOvertime40(!!c)}
          />
          <Label
            htmlFor="overtime40"
            className="text-xs font-normal cursor-pointer"
          >
            Bruk 40 % overtid (1,4×) i stedet for 50 % (1,5×) hverdager
          </Label>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Kveldsovertid 100 % fra kl</Label>
          <Select value={eveningHour} onValueChange={setEveningHour}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Alt overtid 50 %</SelectItem>
              <SelectItem value="18">18:00</SelectItem>
              <SelectItem value="19">19:00</SelectItem>
              <SelectItem value="20">20:00</SelectItem>
              <SelectItem value="21">21:00</SelectItem>
              <SelectItem value="22">22:00</SelectItem>
              <SelectItem value="23">23:00</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Arbeid etter valgt klokkeslett (man–fre) = 100 % overtid. Ellers {overtime40 ? "40" : "50"} %. Helg = 100 %.
          </p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Lørdag-splitt (5,5 t ved 40 %)</Label>
          <Select value={saturdaySplit} onValueChange={setSaturdaySplit}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Alt overtid 100 %</SelectItem>
              <SelectItem value="5.5">5,5 t ved 40 % + rest 100 %</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Lørdag: første 5,5 t overtid ved 40 %, resten 100 %. Søndag = alt 100 %.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "..." : "Lagre regler"}
        </Button>
      </CardContent>
    </Card>
  );
}
