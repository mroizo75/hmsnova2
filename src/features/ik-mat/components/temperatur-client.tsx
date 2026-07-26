"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Thermometer, Plus, X } from "lucide-react";
import type { TemperaturLog } from "@prisma/client";

const UNIT_TYPES: Record<string, { label: string; min: number; max: number; unit: string }> = {
  KJOLEROM:     { label: "Kjølerom",     min: -2,  max: 8,   unit: "°C" },
  FRYSER:       { label: "Fryser",       min: -40, max: -15, unit: "°C" },
  VARMHOLDING:  { label: "Varmholding",  min: 60,  max: 100, unit: "°C" },
  ANNET:        { label: "Annet",        min: -40, max: 100, unit: "°C" },
};

interface Props { logs: TemperaturLog[]; units: string[]; canEdit: boolean; }

export function TemperaturClient({ logs, units: initialUnits, canEdit }: Props) {
  const router = useRouter();
  const [allLogs, setAllLogs] = useState<TemperaturLog[]>(logs);
  const [selectedUnit, setSelectedUnit] = useState<string>("alle");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ unitName: "", unitType: "KJOLEROM", temperature: "", measuredBy: "" });
  const [saving, setSaving] = useState(false);

  const displayLogs = useMemo(() =>
    selectedUnit === "alle" ? allLogs : allLogs.filter((l) => l.unitName === selectedUnit),
    [allLogs, selectedUnit]
  );

  const deviationCount = displayLogs.filter((l) => l.isDeviation).length;
  const allUnits = [...new Set(allLogs.map((l) => l.unitName))];

  async function submitLog() {
    if (!form.unitName || !form.temperature) { toast.error("Fyll inn enhet og temperatur"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ik-mat/temperatur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitName: form.unitName,
          unitType: form.unitType,
          temperature: parseFloat(form.temperature),
          measuredAt: new Date().toISOString(),
          measuredBy: form.measuredBy || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setAllLogs((p) => [data.log, ...p]);
      if (data.log.isDeviation) toast.warning("Avvik registrert – temperaturen er utenfor grenseverdi!");
      else toast.success("Temperatur registrert");
      setShowForm(false);
      setForm({ unitName: "", unitType: "KJOLEROM", temperature: "", measuredBy: "" });
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Thermometer className="h-6 w-6 text-blue-500" />Temperaturlogg</h1>
          <p className="text-sm text-muted-foreground mt-1">
            IK-mat-forskriften § 5 – daglig temperaturkontroll av kjøle- og fryseutstyr
          </p>
        </div>
        {canEdit && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1.5" />Registrer temperatur</Button>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Målinger totalt</p><p className="font-bold text-xl">{allLogs.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avvik</p><p className={`font-bold text-xl ${deviationCount > 0 ? "text-red-600" : "text-green-600"}`}>{displayLogs.filter((l) => l.isDeviation).length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Enheter overvåket</p><p className="font-bold text-xl">{allUnits.length}</p></CardContent></Card>
      </div>

      {deviationCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{deviationCount} temperaturavvik krever umiddelbar oppfølging (IK-mat § 5)</p>
        </div>
      )}

      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Ny temperaturmåling</p>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Enhetsnavn *</Label>
                <Input placeholder="Kjølerom 1 / Fryser kjøkken" value={form.unitName} onChange={(e) => setForm((p) => ({ ...p, unitName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Enhetstype</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.unitType} onChange={(e) => setForm((p) => ({ ...p, unitType: e.target.value }))}>
                  {Object.entries(UNIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.min}–{v.max}°C)</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Temperatur (°C) *</Label>
                <Input type="number" step="0.1" placeholder="-2.5" value={form.temperature} onChange={(e) => setForm((p) => ({ ...p, temperature: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Målt av</Label>
                <Input placeholder="Navn/initialer" value={form.measuredBy} onChange={(e) => setForm((p) => ({ ...p, measuredBy: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" disabled={saving} onClick={submitLog}>{saving ? "Lagrer..." : "Registrer"}</Button>
          </CardContent>
        </Card>
      )}

      {/* Filtreringslinje */}
      <div className="flex flex-wrap gap-2">
        {["alle", ...allUnits].map((u) => (
          <button
            key={u}
            onClick={() => setSelectedUnit(u)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${selectedUnit === u ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
          >
            {u === "alle" ? "Alle enheter" : u}
          </button>
        ))}
      </div>

      {displayLogs.length === 0 ? (
        <Card><CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Thermometer className="h-8 w-8 opacity-30" />
          <p className="text-sm">Ingen temperaturer registrert ennå</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b">
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Enhet</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Type</th>
              <th className="text-right p-2 font-medium text-xs text-muted-foreground">Temp.</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Tidspunkt</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Av</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Status</th>
            </tr></thead>
            <tbody>
              {displayLogs.map((l) => (
                <tr key={l.id} className={`border-b last:border-0 ${l.isDeviation ? "bg-red-50/50" : "hover:bg-muted/20"}`}>
                  <td className="p-2 font-medium">{l.unitName}</td>
                  <td className="p-2 text-muted-foreground text-xs">{UNIT_TYPES[l.unitType]?.label ?? l.unitType}</td>
                  <td className={`p-2 text-right font-mono font-semibold ${l.isDeviation ? "text-red-600" : "text-green-600"}`}>{l.temperature}°C</td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(l.measuredAt).toLocaleString("nb-NO")}</td>
                  <td className="p-2 text-xs text-muted-foreground">{l.measuredBy ?? "–"}</td>
                  <td className="p-2">
                    {l.isDeviation
                      ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="h-3.5 w-3.5" />Avvik</span>
                      : <span className="text-xs text-green-600 font-medium">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
