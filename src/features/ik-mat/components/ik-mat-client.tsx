"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Thermometer,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Smile,
  Plus,
  ChevronRight,
  Info,
} from "lucide-react";
import type {
  HaccpPlan,
  HaccpCcp,
  TemperaturLog,
  AllergenOversikt,
  MattilsynetInspeksjon,
} from "@prisma/client";

type HaccpPlanWithCcp = HaccpPlan & { ccp: HaccpCcp[] };

interface Props {
  haccpPlans: HaccpPlanWithCcp[];
  latestLogs: TemperaturLog[];
  allergenItems: AllergenOversikt[];
  inspeksjoner: MattilsynetInspeksjon[];
  deviationCount: number;
  canEdit: boolean;
}

const SMILEFJES: Record<string, { label: string; emoji: string; color: string }> = {
  STRAALENDE: { label: "Strålende",  emoji: "😃", color: "text-green-600" },
  GODT:       { label: "Godt",       emoji: "🙂", color: "text-lime-600" },
  NOYTRAL:    { label: "Nøytral",    emoji: "😐", color: "text-yellow-600" },
  TRIST:      { label: "Trist",      emoji: "😞", color: "text-red-600" },
};

const ALLERGEN_LABELS: Array<{ key: keyof AllergenOversikt; label: string }> = [
  { key: "hasGluten",   label: "Gluten" },
  { key: "hasKrepsdyr", label: "Krepsdyr" },
  { key: "hasEgg",      label: "Egg" },
  { key: "hasFisk",     label: "Fisk" },
  { key: "hasPeanut",   label: "Peanøtter" },
  { key: "hasSoya",     label: "Soya" },
  { key: "hasMelk",     label: "Melk/laktose" },
  { key: "hasNotter",   label: "Nøtter" },
  { key: "hasSelleri",  label: "Selleri" },
  { key: "hasSennep",   label: "Sennep" },
  { key: "hasSesamfro", label: "Sesamfrø" },
  { key: "hasSulfitt",  label: "Sulfitt" },
  { key: "hasLupin",    label: "Lupin" },
  { key: "hasBlotkdyr", label: "Bløtdyr" },
];

export function IkMatClient({ haccpPlans, latestLogs, allergenItems, inspeksjoner, deviationCount, canEdit }: Props) {
  const router = useRouter();

  // Temperature log form state
  const [tempForm, setTempForm] = useState({
    unitName: "",
    unitType: "KJOLEROM" as "KJOLEROM" | "FRYSER" | "VARMHOLDING" | "ANNET",
    temperature: "",
    measuredBy: "",
  });
  const [savingTemp, setSavingTemp] = useState(false);

  async function logTemp() {
    if (!tempForm.unitName || !tempForm.temperature) {
      toast.error("Fyll inn enhetsnavn og temperatur");
      return;
    }
    setSavingTemp(true);
    try {
      const res = await fetch("/api/ik-mat/temperatur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitName: tempForm.unitName,
          unitType: tempForm.unitType,
          temperature: parseFloat(tempForm.temperature),
          measuredAt: new Date().toISOString(),
          measuredBy: tempForm.measuredBy || null,
        }),
      });
      if (!res.ok) throw new Error("Feil ved lagring");
      toast.success("Temperatur logget");
      setTempForm((p) => ({ ...p, temperature: "", measuredBy: "" }));
      router.refresh();
    } catch {
      toast.error("Kunne ikke lagre temperatur");
    } finally {
      setSavingTemp(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Thermometer className="h-6 w-6 text-orange-500" />
          IK-mat og HACCP
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          IK-mat § 4 og § 5 og forordning (EF) 852/2004 art. 5 – internkontroll for mat og HACCP
        </p>
      </div>

      {/* Hurtiglenker til sub-sider */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/dashboard/ik-mat/haccp" className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
          <span className="text-xl">🔬</span>
          <div><p className="text-sm font-medium">HACCP Fareanalyse</p><p className="text-xs text-muted-foreground">Bygg og vedlikehold HACCP-planer</p></div>
        </Link>
        <Link href="/dashboard/ik-mat/temperatur" className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
          <span className="text-xl">🌡️</span>
          <div><p className="text-sm font-medium">Temperaturlogg</p><p className="text-xs text-muted-foreground">Daglig loggføring kjøle/frys</p></div>
        </Link>
        <Link href="/dashboard/ik-mat/allergener" className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
          <span className="text-xl">⚠️</span>
          <div><p className="text-sm font-medium">Allergenoversikt</p><p className="text-xs text-muted-foreground">14 lovpålagte EU-allergener</p></div>
        </Link>
      </div>

      {/* Statusoversikt */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Aktive HACCP-planer</p>
            <p className="font-bold text-xl">{haccpPlans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Temperaturavvik (siste 20)</p>
            <p className={`font-bold text-xl ${deviationCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {deviationCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Retter i allergenoversikt</p>
            <p className="font-bold text-xl">{allergenItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Siste Mattilsynet-besøk</p>
            <p className="font-bold text-sm">
              {inspeksjoner[0]
                ? new Date(inspeksjoner[0].inspectedAt).toLocaleDateString("nb-NO")
                : "Ikke registrert"}
            </p>
          </CardContent>
        </Card>
      </div>

      {deviationCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {deviationCount} temperaturavvik er registrert de siste loggingene – sjekk kjøle-/fryseanleggene.
          </p>
        </div>
      )}

      <Tabs defaultValue="haccp">
        <TabsList>
          <TabsTrigger value="haccp">HACCP-planer</TabsTrigger>
          <TabsTrigger value="temperatur">Temperaturlogg</TabsTrigger>
          <TabsTrigger value="allergener">Allergenoversikt</TabsTrigger>
          <TabsTrigger value="mattilsynet">Mattilsynet</TabsTrigger>
        </TabsList>

        {/* HACCP */}
        <TabsContent value="haccp" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">HACCP-planer</h2>
              <p className="text-xs text-muted-foreground">Forordning (EF) 852/2004 Art. 5 – fareanalyse med kritiske kontrollpunkter</p>
            </div>
            {canEdit && (
              <Button size="sm" onClick={async () => {
                try {
                  const res = await fetch("/api/ik-mat/haccp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: "Ny HACCP-plan " + new Date().toLocaleDateString("nb-NO") }),
                  });
                  if (!res.ok) throw new Error();
                  toast.success("HACCP-plan opprettet");
                  router.refresh();
                } catch { toast.error("Feil ved opprettelse"); }
              }}>
                <Plus className="h-4 w-4 mr-1.5" /> Ny HACCP-plan
              </Button>
            )}
          </div>

          {haccpPlans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-30" />
                <p className="text-sm">Ingen HACCP-planer opprettet ennå</p>
                <p className="text-xs text-center max-w-sm">
                  HACCP krever fareanalyse og kritiske kontrollpunkter (CCP) for alle produksjonstrinn. Forordning (EF) 852/2004 art. 5.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {haccpPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">{plan.ccp.length} CCP-punkt · Versjon {plan.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.isActive ? "default" : "outline"}>
                        {plan.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/ik-mat/haccp?planId=${plan.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TEMPERATURLOGG */}
        <TabsContent value="temperatur" className="mt-4 space-y-4">
          <div>
            <h2 className="font-semibold">Temperaturlogg</h2>
            <p className="text-xs text-muted-foreground">Daglig logging av kjøle-/fryseanlegg. HACCP CCP – kritisk grenseverdi.</p>
          </div>

          {canEdit && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Registrer ny temperaturmåling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Enhet *</Label>
                    <Input placeholder="Kjølerom 1" value={tempForm.unitName} onChange={(e) => setTempForm((p) => ({ ...p, unitName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={tempForm.unitType}
                      onChange={(e) => setTempForm((p) => ({ ...p, unitType: e.target.value as any }))}
                    >
                      <option value="KJOLEROM">Kjølerom</option>
                      <option value="FRYSER">Fryser</option>
                      <option value="VARMHOLDING">Varmholding</option>
                      <option value="ANNET">Annet</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Temperatur (°C) *</Label>
                    <Input type="number" step="0.1" placeholder="4.0" value={tempForm.temperature} onChange={(e) => setTempForm((p) => ({ ...p, temperature: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Målt av</Label>
                    <Input placeholder="Initialer / navn" value={tempForm.measuredBy} onChange={(e) => setTempForm((p) => ({ ...p, measuredBy: e.target.value }))} />
                  </div>
                </div>
                <Button size="sm" disabled={savingTemp} onClick={logTemp}>
                  {savingTemp ? "Lagrer..." : "Registrer"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1">
            {latestLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Ingen temperaturmålinger registrert ennå</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-xs text-muted-foreground">Enhet</th>
                      <th className="text-left p-2 font-medium text-xs text-muted-foreground">Type</th>
                      <th className="text-right p-2 font-medium text-xs text-muted-foreground">°C</th>
                      <th className="text-left p-2 font-medium text-xs text-muted-foreground">Tidspunkt</th>
                      <th className="text-left p-2 font-medium text-xs text-muted-foreground">Ansvarlig</th>
                      <th className="text-left p-2 font-medium text-xs text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestLogs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2 font-medium">{log.unitName}</td>
                        <td className="p-2 text-muted-foreground">{log.unitType}</td>
                        <td className={`p-2 text-right font-mono font-bold ${log.isDeviation ? "text-red-600" : "text-green-600"}`}>
                          {log.temperature}°
                        </td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {new Date(log.measuredAt).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-2 text-muted-foreground">{log.measuredBy ?? "–"}</td>
                        <td className="p-2">
                          {log.isDeviation ? (
                            <Badge variant="destructive" className="text-xs">Avvik</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600">OK</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ALLERGENER */}
        <TabsContent value="allergener" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Allergenoversikt</h2>
              <p className="text-xs text-muted-foreground">EU-forordning 1169/2011 – de 14 obligatoriske EU-allergener</p>
            </div>
            {canEdit && (
              <Button size="sm" asChild>
                <Link href="/dashboard/ik-mat/allergener">
                  <Plus className="h-4 w-4 mr-1.5" /> Rediger
                </Link>
              </Button>
            )}
          </div>

          {allergenItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <Info className="h-8 w-8 opacity-30" />
                <p className="text-sm">Ingen retter registrert</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Rett</th>
                    <th className="text-left p-2 font-medium">Kategori</th>
                    {ALLERGEN_LABELS.map((a) => (
                      <th key={a.key} className="text-center p-1 font-medium rotate-0 w-8" title={a.label}>
                        <span className="text-[10px]">{a.label.slice(0, 5)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allergenItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 font-medium">{item.dishName}</td>
                      <td className="p-2 text-muted-foreground">{item.category ?? "–"}</td>
                      {ALLERGEN_LABELS.map((a) => (
                        <td key={a.key} className="p-1 text-center">
                          {item[a.key] ? (
                            <span className="inline-block w-4 h-4 rounded bg-red-500 text-white text-[9px] leading-4">!</span>
                          ) : (
                            <span className="inline-block w-4 h-4 rounded bg-muted text-muted-foreground text-[9px] leading-4">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* MATTILSYNET */}
        <TabsContent value="mattilsynet" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Mattilsynet-inspeksjoner</h2>
              <p className="text-xs text-muted-foreground">Smilefjesordningen FOR 2016-05-19-501</p>
            </div>
            {canEdit && (
              <Button size="sm" onClick={async () => {
                try {
                  const res = await fetch("/api/ik-mat/mattilsynet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inspectedAt: new Date().toISOString(), smilejesKarakter: "GODT" }),
                  });
                  if (!res.ok) throw new Error();
                  toast.success("Inspeksjon registrert");
                  router.refresh();
                } catch { toast.error("Feil"); }
              }}>
                <Plus className="h-4 w-4 mr-1.5" /> Registrer tilsyn
              </Button>
            )}
          </div>

          {inspeksjoner.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <Smile className="h-8 w-8 opacity-30" />
                <p className="text-sm">Ingen tilsynsbesøk registrert ennå</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inspeksjoner.map((ins) => {
                const karakter = ins.smilejesKarakter ? SMILEFJES[ins.smilejesKarakter] : null;
                return (
                  <Card key={ins.id}>
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {karakter && <span className="text-2xl">{karakter.emoji}</span>}
                          <span className="font-medium">{new Date(ins.inspectedAt).toLocaleDateString("nb-NO")}</span>
                          {karakter && <span className={`text-sm font-medium ${karakter.color}`}>{karakter.label}</span>}
                        </div>
                        {ins.inspector && <p className="text-xs text-muted-foreground">Inspektør: {ins.inspector}</p>}
                        {ins.findings && <p className="text-sm text-muted-foreground">{ins.findings}</p>}
                        {ins.followUpDeadline && (
                          <p className="text-xs text-orange-600">
                            Oppfølging innen: {new Date(ins.followUpDeadline).toLocaleDateString("nb-NO")}
                          </p>
                        )}
                      </div>
                      {ins.closedAt ? (
                        <Badge variant="outline" className="text-green-600 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Lukket
                        </Badge>
                      ) : ins.followUpDeadline ? (
                        <Badge variant="outline" className="text-orange-600 shrink-0">Åpen</Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
