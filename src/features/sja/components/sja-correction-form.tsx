"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { correctSjaContent } from "@/server/actions/sja.actions";

type HazardDraft = {
  activity: string;
  hazard: string;
  measures: string;
  probability: number;
  severity: number;
  consequence: string;
  responsibleName: string;
  linkedRiskId: string | null;
};

interface SjaCorrectionFormProps {
  analysis: {
    id: string;
    title: string;
    description: string | null;
    workLocation: string;
    plannedDate: string;
    responsibleName: string;
    participants: string | null;
    additionalConditions: string | null;
    weatherConditions: string | null;
    electricalWorkType: string;
    workMethod: string | null;
    requiredEquipment: string | null;
    requiredPpe: string | null;
    personnelRequirements: string | null;
    safetyConditions: string | null;
    hazards: Array<{
      activity: string;
      hazard: string;
      measures: string;
      probability: number;
      severity: number;
      consequence: string | null;
      responsibleName: string | null;
      linkedRiskId: string | null;
    }>;
  };
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyHazard = (): HazardDraft => ({
  activity: "",
  hazard: "",
  measures: "",
  probability: 1,
  severity: 1,
  consequence: "",
  responsibleName: "",
  linkedRiskId: null,
});

export function SjaCorrectionForm({ analysis }: SjaCorrectionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(analysis.title);
  const [description, setDescription] = useState(analysis.description ?? "");
  const [workLocation, setWorkLocation] = useState(analysis.workLocation);
  const [plannedDate, setPlannedDate] = useState(toLocalInput(analysis.plannedDate));
  const [responsibleName, setResponsibleName] = useState(analysis.responsibleName);
  const [participants, setParticipants] = useState(analysis.participants ?? "");
  const [additionalConditions, setAdditionalConditions] = useState(analysis.additionalConditions ?? "");
  const [weatherConditions, setWeatherConditions] = useState(analysis.weatherConditions ?? "");
  const [workMethod, setWorkMethod] = useState(analysis.workMethod ?? "");
  const [requiredEquipment, setRequiredEquipment] = useState(analysis.requiredEquipment ?? "");
  const [requiredPpe, setRequiredPpe] = useState(analysis.requiredPpe ?? "");
  const [personnelRequirements, setPersonnelRequirements] = useState(analysis.personnelRequirements ?? "");
  const [safetyConditions, setSafetyConditions] = useState(analysis.safetyConditions ?? "");
  const [hazards, setHazards] = useState<HazardDraft[]>(
    analysis.hazards.length > 0
      ? analysis.hazards.map((hazard) => ({
          activity: hazard.activity,
          hazard: hazard.hazard,
          measures: hazard.measures,
          probability: hazard.probability,
          severity: hazard.severity,
          consequence: hazard.consequence ?? "",
          responsibleName: hazard.responsibleName ?? "",
          linkedRiskId: hazard.linkedRiskId,
        }))
      : [emptyHazard()],
  );
  const isElectrical = analysis.electricalWorkType !== "NOT_APPLICABLE";

  function updateHazard(index: number, patch: Partial<HazardDraft>) {
    setHazards((current) => current.map((hazard, hazardIndex) => (
      hazardIndex === index ? { ...hazard, ...patch } : hazard
    )));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await correctSjaContent({
      id: analysis.id,
      title,
      description,
      workLocation,
      plannedDate,
      responsibleName,
      participants,
      additionalConditions,
      weatherConditions,
      workMethod,
      requiredEquipment,
      requiredPpe,
      personnelRequirements,
      safetyConditions,
      hazards: hazards.map((hazard) => ({
        ...hazard,
        consequence: hazard.consequence || null,
        responsibleName: hazard.responsibleName || null,
      })),
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
      return;
    }
    toast({ title: "SJA rettet", description: "Innholdet er oppdatert. Statusen er uendret." });
    router.push(`/dashboard/sja/${analysis.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Retter feil i innsendingen. Status og godkjenning blir stående. Deltakere må bekrefte innholdet på nytt hvis de allerede har gjort det.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Tittel</Label>
          <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workLocation">Arbeidssted</Label>
          <Input id="workLocation" value={workLocation} onChange={(event) => setWorkLocation(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plannedDate">Planlagt tid</Label>
          <Input id="plannedDate" type="datetime-local" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsibleName">Ansvarlig</Label>
          <Input id="responsibleName" value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="participants">Deltakere</Label>
          <Textarea id="participants" value={participants} onChange={(event) => setParticipants(event.target.value)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Beskrivelse</Label>
          <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="additionalConditions">Andre forhold</Label>
          <Textarea id="additionalConditions" value={additionalConditions} onChange={(event) => setAdditionalConditions(event.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="weatherConditions">Vær</Label>
          <Input id="weatherConditions" value={weatherConditions} onChange={(event) => setWeatherConditions(event.target.value)} />
        </div>
      </div>

      {isElectrical && (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="workMethod">Arbeidsmetode</Label>
            <Textarea id="workMethod" value={workMethod} onChange={(event) => setWorkMethod(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredEquipment">Utstyr</Label>
            <Textarea id="requiredEquipment" value={requiredEquipment} onChange={(event) => setRequiredEquipment(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredPpe">Verneutstyr</Label>
            <Textarea id="requiredPpe" value={requiredPpe} onChange={(event) => setRequiredPpe(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personnelRequirements">Personell</Label>
            <Textarea id="personnelRequirements" value={personnelRequirements} onChange={(event) => setPersonnelRequirements(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="safetyConditions">Sikkerhetsbetingelser</Label>
            <Textarea id="safetyConditions" value={safetyConditions} onChange={(event) => setSafetyConditions(event.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Farer og tiltak</h2>
          <Button type="button" variant="outline" onClick={() => setHazards((current) => [...current, emptyHazard()])}>
            Legg til fare
          </Button>
        </div>
        {hazards.map((hazard, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Aktivitet</Label>
                <Input value={hazard.activity} onChange={(event) => updateHazard(index, { activity: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Fare</Label>
                <Input value={hazard.hazard} onChange={(event) => updateHazard(index, { hazard: event.target.value })} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Tiltak</Label>
                <Textarea value={hazard.measures} onChange={(event) => updateHazard(index, { measures: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Sannsynlighet (1–5)</Label>
                <Input type="number" min={1} max={5} value={hazard.probability} onChange={(event) => updateHazard(index, { probability: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Konsekvens (1–5)</Label>
                <Input type="number" min={1} max={5} value={hazard.severity} onChange={(event) => updateHazard(index, { severity: Number(event.target.value) })} />
              </div>
            </div>
            {hazards.length > 1 && (
              <Button type="button" variant="outline" onClick={() => setHazards((current) => current.filter((_, hazardIndex) => hazardIndex !== index))}>
                Fjern fare
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Lagrer…" : "Lagre retting"}
      </Button>
    </form>
  );
}
