"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateTimeRegistrationConfig } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { Banknote } from "lucide-react";

interface TimeRegistrationPayrollSettingsProps {
  tenantId: string;
  defaultHourlyRate: number | null;
  approximateTaxPercent: number | null;
  defaultKmRate: number | null;
  kmAllowanceTaxable: boolean;
}

export function TimeRegistrationPayrollSettings({
  tenantId,
  defaultHourlyRate,
  approximateTaxPercent,
  defaultKmRate,
  kmAllowanceTaxable,
}: TimeRegistrationPayrollSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(
    defaultHourlyRate != null ? String(defaultHourlyRate) : ""
  );
  const [taxPercent, setTaxPercent] = useState(
    approximateTaxPercent != null ? String(approximateTaxPercent) : "25"
  );
  const [kmRate, setKmRate] = useState(
    defaultKmRate != null ? String(defaultKmRate) : "5.30"
  );
  const [kmTaxable, setKmTaxable] = useState(kmAllowanceTaxable);

  useEffect(() => {
    setHourlyRate(defaultHourlyRate != null ? String(defaultHourlyRate) : "");
  }, [defaultHourlyRate]);
  useEffect(() => {
    setTaxPercent(
      approximateTaxPercent != null ? String(approximateTaxPercent) : "25"
    );
  }, [approximateTaxPercent]);
  useEffect(() => {
    setKmRate(defaultKmRate != null ? String(defaultKmRate) : "5.30");
  }, [defaultKmRate]);
  useEffect(() => {
    setKmTaxable(kmAllowanceTaxable);
  }, [kmAllowanceTaxable]);

  const handleSave = async () => {
    const rateVal = hourlyRate.trim() ? parseFloat(hourlyRate.replace(",", ".")) : null;
    const taxVal = taxPercent.trim() ? parseFloat(taxPercent.replace(",", ".")) : null;
    const kmVal = kmRate.trim() ? parseFloat(kmRate.replace(",", ".")) : null;
    if (rateVal != null && (isNaN(rateVal) || rateVal < 0 || rateVal > 9999)) {
      toast({ variant: "destructive", title: "Timelønn må være 0–9999 kr" });
      return;
    }
    if (taxVal != null && (isNaN(taxVal) || taxVal < 0 || taxVal > 100)) {
      toast({ variant: "destructive", title: "Skatt må være 0–100 %" });
      return;
    }
    if (kmVal != null && (isNaN(kmVal) || kmVal < 0 || kmVal > 100)) {
      toast({ variant: "destructive", title: "Km-sats må være 0–100 kr" });
      return;
    }
    setLoading(true);
    try {
      const res = await updateTimeRegistrationConfig(tenantId, {
        defaultHourlyRate: rateVal,
        approximateTaxPercent: taxVal ?? 25,
        defaultKmRate: kmVal ?? 4.5,
        kmAllowanceTaxable: kmTaxable,
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: "Lønninnstillinger lagret" });
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
          <Banknote className="h-5 w-5" />
          Lønn – ca. utbetaling
        </CardTitle>
        <CardDescription>
          Timelønn og ca. skatt for beregning av ca. utbetaling til ansatte. Kun estimat – faktisk lønn beregnes av lønnssystem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-xs">Timelønn (N.Rate) kr/time</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="290"
            className="w-28"
          />
          <p className="text-xs text-muted-foreground">
            Tom = skjul ca. utbetaling for ansatte. Ordinær timelønn brukes for beregning.
          </p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">Ca. skatt (%) – basert på Tabell 7100</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            placeholder="25"
            className="w-20"
          />
          <p className="text-xs text-muted-foreground">
            Typisk 25–35 % for fast trekk. Brukes til ca. utbetaling = bruttolønn − (brutto × skatt %).
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
            Statens sats 2026: 5,30 kr/km. Første 3,50 kr/km er trekkfri.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm">Skatt av overskudd på km godtgjørelse</Label>
            <p className="text-xs text-muted-foreground">
              Avkrysset: Overskudd over 3,50 kr/km skattes. Ikke avkrysset: Km er utenom skatt.
            </p>
          </div>
          <Switch checked={kmTaxable} onCheckedChange={setKmTaxable} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "..." : "Lagre"}
        </Button>
      </CardContent>
    </Card>
  );
}
