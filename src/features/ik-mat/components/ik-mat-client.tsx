"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Thermometer,
  AlertTriangle,
  Smile,
  Plus,
  ChevronRight,
  FlaskConical,
  Package,
  Sparkles,
  ClipboardList,
  UtensilsCrossed,
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
  varemottakCount: number;
  renholdCount: number;
  canEdit: boolean;
}

const SMILEFJES: Record<string, { label: string; emoji: string }> = {
  STRAALENDE: { label: "Strålende", emoji: "😃" },
  GODT: { label: "Godt", emoji: "🙂" },
  NOYTRAL: { label: "Nøytral", emoji: "😐" },
  TRIST: { label: "Trist", emoji: "😞" },
};

export function IkMatClient({
  haccpPlans,
  latestLogs,
  allergenItems,
  inspeksjoner,
  deviationCount,
  varemottakCount,
  renholdCount,
  canEdit,
}: Props) {
  const router = useRouter();
  const [tempForm, setTempForm] = useState({
    unitName: "",
    unitType: "KJOLEROM" as "KJOLEROM" | "FRYSER" | "VARMHOLDING" | "ANNET",
    temperature: "",
    measuredBy: "",
  });
  const [savingTemp, setSavingTemp] = useState(false);
  const [savingTilsyn, setSavingTilsyn] = useState(false);

  const sisteTilsyn = inspeksjoner[0];
  const smilefjes = sisteTilsyn?.smilejesKarakter
    ? SMILEFJES[sisteTilsyn.smilejesKarakter]
    : null;

  async function logTemp() {
    if (!tempForm.unitName || !tempForm.temperature) {
      toast.error("Fyll inn enhet og temperatur");
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
      if (!res.ok) throw new Error();
      toast.success("Temperatur logget");
      setTempForm((p) => ({ ...p, temperature: "", measuredBy: "" }));
      router.refresh();
    } catch {
      toast.error("Kunne ikke lagre temperatur");
    } finally {
      setSavingTemp(false);
    }
  }

  async function registrerTilsyn() {
    setSavingTilsyn(true);
    try {
      const res = await fetch("/api/ik-mat/mattilsynet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectedAt: new Date().toISOString(),
          smilejesKarakter: "GODT",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tilsyn registrert");
      router.refresh();
    } catch {
      toast.error("Kunne ikke registrere tilsyn");
    } finally {
      setSavingTilsyn(false);
    }
  }

  const modules = [
    {
      href: "/dashboard/ik-mat/temperatur",
      title: "Temperatur",
      status: deviationCount > 0 ? `${deviationCount} avvik` : `${latestLogs.length} målinger`,
      warn: deviationCount > 0,
      icon: Thermometer,
    },
    {
      href: "/dashboard/ik-mat/varemottak",
      title: "Varemottak",
      status: `${varemottakCount} registreringer`,
      warn: false,
      icon: Package,
    },
    {
      href: "/dashboard/ik-mat/renhold",
      title: "Renhold",
      status: `${renholdCount} registreringer`,
      warn: false,
      icon: Sparkles,
    },
    {
      href: "/dashboard/ik-mat/allergener",
      title: "Allergener",
      status: `${allergenItems.length} retter`,
      warn: false,
      icon: AlertTriangle,
    },
    {
      href: "/dashboard/ik-mat/haccp",
      title: "HACCP",
      status: `${haccpPlans.length} planer`,
      warn: false,
      icon: FlaskConical,
    },
    {
      href: "/dashboard/incidents",
      title: "Avvik",
      status: "Matavvik og tiltak",
      warn: false,
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <UtensilsCrossed className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">IK-mat</h1>
            <p className="text-muted-foreground mt-1">
              Temperatur, mottak, renhold, allergener og HACCP — IK-mat § 5
            </p>
          </div>
        </div>
      </div>

      {deviationCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {deviationCount} temperaturavvik de siste målingene. Sjekk kjøl og frys.
          </p>
          <Button size="sm" variant="outline" className="ml-auto bg-transparent" asChild>
            <Link href="/dashboard/ik-mat/temperatur">Åpne logg</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{mod.title}</p>
                <p className={`text-sm ${mod.warn ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                  {mod.status}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      {canEdit && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="font-medium">Logg temperatur nå</p>
              <p className="text-xs text-muted-foreground">Daglig kontroll av kjøl og frys</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Enhet</Label>
                <Input
                  placeholder="Kjølerom 1"
                  value={tempForm.unitName}
                  onChange={(e) => setTempForm((p) => ({ ...p, unitName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <select
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={tempForm.unitType}
                  onChange={(e) =>
                    setTempForm((p) => ({
                      ...p,
                      unitType: e.target.value as typeof tempForm.unitType,
                    }))
                  }
                >
                  <option value="KJOLEROM">Kjølerom</option>
                  <option value="FRYSER">Fryser</option>
                  <option value="VARMHOLDING">Varmholding</option>
                  <option value="ANNET">Annet</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">°C</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="4.0"
                  value={tempForm.temperature}
                  onChange={(e) => setTempForm((p) => ({ ...p, temperature: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Målt av</Label>
                <Input
                  placeholder="Initialer"
                  value={tempForm.measuredBy}
                  onChange={(e) => setTempForm((p) => ({ ...p, measuredBy: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" disabled={savingTemp} onClick={logTemp}>
              {savingTemp ? "Lagrer…" : "Registrer"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Smile className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Mattilsynet</p>
              <p className="text-sm text-muted-foreground">
                {sisteTilsyn
                  ? `${smilefjes ? `${smilefjes.emoji} ${smilefjes.label} · ` : ""}${new Date(sisteTilsyn.inspectedAt).toLocaleDateString("nb-NO")}`
                  : "Ingen tilsyn registrert"}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent"
              disabled={savingTilsyn}
              onClick={registrerTilsyn}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Registrer tilsyn
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
