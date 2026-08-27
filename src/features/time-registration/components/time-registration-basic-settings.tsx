"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTimeRegistrationConfig } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface TimeRegistrationBasicSettingsProps {
  tenantId: string;
  weeklyHoursNorm: number;
  defaultKmRate: number | null;
}

export function TimeRegistrationBasicSettings({
  tenantId,
  weeklyHoursNorm,
  defaultKmRate,
}: TimeRegistrationBasicSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weeklyNorm, setWeeklyNorm] = useState(
    weeklyHoursNorm === 40 ? "40" : "37.5"
  );
  const [kmRate, setKmRate] = useState(
    defaultKmRate != null ? String(defaultKmRate) : "5.30"
  );

  useEffect(() => {
    setWeeklyNorm(weeklyHoursNorm === 40 ? "40" : "37.5");
  }, [weeklyHoursNorm]);

  useEffect(() => {
    setKmRate(defaultKmRate != null ? String(defaultKmRate) : "5.30");
  }, [defaultKmRate]);

  const handleSave = async () => {
    const kmVal = kmRate.trim() ? parseFloat(kmRate.replace(",", ".")) : null;
    if (kmVal != null && (isNaN(kmVal) || kmVal < 0 || kmVal > 100)) {
      toast({ variant: "destructive", title: "Km-sats må være 0–100 kr" });
      return;
    }
    const weeklyVal = weeklyNorm === "40" ? 40 : 37.5;
    setLoading(true);
    try {
      const res = await updateTimeRegistrationConfig(tenantId, {
        weeklyHoursNorm: weeklyVal,
        defaultKmRate: kmVal ?? 5.3,
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
          <Clock className="h-5 w-5" />
          Grunninnstillinger
        </CardTitle>
        <CardDescription>
          Daglig arbeidstid og km-sats. Timelisten eksporteres til Excel for regnskapet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            Brukes for å beregne ukentlig totalsum i oversikten.
          </p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Standard km-sats (kr/km)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={kmRate}
            onChange={(e) => setKmRate(e.target.value)}
            placeholder="5.30"
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Statens sats 2026: 5,30 kr/km. Brukes når ansatte registrerer kjøring.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "..." : "Lagre"}
        </Button>
      </CardContent>
    </Card>
  );
}
