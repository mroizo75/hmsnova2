"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  createSjaTemplate,
  updateSjaTemplate,
} from "@/server/actions/sja.actions";
import type { ElectricalWorkType } from "@/features/sja/lib/sja-fse";

interface TemplateHazard {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
  responsibleName: string;
}

export interface SjaTemplateEditorData {
  id?: string;
  name: string;
  description: string;
  workLocation: string;
  electricalWorkType: ElectricalWorkType;
  workMethod: string;
  requiredEquipment: string;
  requiredPpe: string;
  personnelRequirements: string;
  safetyConditions: string;
  requiresSecondPerson: boolean;
  requiredCourseKeys: string[];
  hazards: TemplateHazard[];
}

const emptyHazard: TemplateHazard = {
  activity: "",
  hazard: "",
  consequence: "",
  probability: 1,
  severity: 1,
  measures: "",
  responsibleName: "",
};

const emptyTemplate: SjaTemplateEditorData = {
  name: "",
  description: "",
  workLocation: "",
  electricalWorkType: "NOT_APPLICABLE",
  workMethod: "",
  requiredEquipment: "",
  requiredPpe: "",
  personnelRequirements: "",
  safetyConditions: "",
  requiresSecondPerson: false,
  requiredCourseKeys: [],
  hazards: [{ ...emptyHazard }],
};

const courseOptions = [
  { key: "elektro-fse-grunnkurs", label: "FSE-opplæring" },
  { key: "elektro-forstehjelp", label: "Førstehjelp ved strømulykker" },
  { key: "elektro-fse-lavspenning", label: "AUS lavspenning" },
  { key: "elektro-lysbue", label: "Lysbuerisiko" },
];

interface SjaTemplateEditorProps {
  initialData?: SjaTemplateEditorData;
  onSaved?: () => void;
}

export function SjaTemplateEditor({ initialData = emptyTemplate, onSaved }: SjaTemplateEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [electricalWorkType, setElectricalWorkType] = useState<ElectricalWorkType>(
    initialData.electricalWorkType,
  );
  const [requiresSecondPerson, setRequiresSecondPerson] = useState(
    initialData.requiresSecondPerson,
  );
  const [requiredCourseKeys, setRequiredCourseKeys] = useState(initialData.requiredCourseKeys);
  const [hazards, setHazards] = useState(initialData.hazards);

  function updateHazard(index: number, patch: Partial<TemplateHazard>) {
    setHazards((current) =>
      current.map((hazard, hazardIndex) =>
        hazardIndex === index ? { ...hazard, ...patch } : hazard,
      ),
    );
  }

  function toggleCourse(courseKey: string, checked: boolean) {
    setRequiredCourseKeys((current) =>
      checked
        ? Array.from(new Set([...current, courseKey]))
        : current.filter((key) => key !== courseKey),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validHazards = hazards.filter(
      (hazard) => hazard.activity.trim() && hazard.hazard.trim() && hazard.measures.trim(),
    );
    if (validHazards.length === 0) {
      toast({
        variant: "destructive",
        title: "Minst én fare må fylles ut",
        description: "Aktivitet, fare og tiltak er obligatorisk.",
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      id: initialData.id,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      workLocation: String(formData.get("workLocation") ?? ""),
      electricalWorkType,
      workMethod: String(formData.get("workMethod") ?? ""),
      requiredEquipment: String(formData.get("requiredEquipment") ?? ""),
      requiredPpe: String(formData.get("requiredPpe") ?? ""),
      personnelRequirements: String(formData.get("personnelRequirements") ?? ""),
      safetyConditions: String(formData.get("safetyConditions") ?? ""),
      requiresSecondPerson,
      requiredCourseKeys,
      hazards: validHazards.map((hazard, index) => ({ ...hazard, sortOrder: index })),
    };

    try {
      const result = initialData.id
        ? await updateSjaTemplate(payload)
        : await createSjaTemplate(payload);
      if (!result.success) throw new Error(result.error);
      toast({
        title: initialData.id ? "Malen er oppdatert" : "Malen er opprettet",
        description: "Ansatte får de nye standardverdiene neste gang de starter en SJA.",
      });
      onSaved?.();
      router.push("/dashboard/sja/maler");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre malen",
        description: error instanceof Error ? error.message : "Ukjent feil",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Malnavn *</Label>
          <Input id="name" name="name" required minLength={3} defaultValue={initialData.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workLocation">Standard arbeidssted</Label>
          <Input id="workLocation" name="workLocation" defaultValue={initialData.workLocation} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Kort beskrivelse</Label>
          <Textarea id="description" name="description" defaultValue={initialData.description} />
        </div>
      </section>

      <section className="space-y-5 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <div>
          <h2 className="font-semibold text-amber-950">Arbeidsforutsetninger</h2>
          <p className="text-sm text-amber-900/75">
            Verdiene følger malen og er ferdig utfylt for den ansatte.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Type elektroarbeid</Label>
            <Select
              value={electricalWorkType}
              onValueChange={(value) => setElectricalWorkType(value as ElectricalWorkType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_APPLICABLE">Ikke elektroarbeid</SelectItem>
                <SelectItem value="DE_ENERGIZED">Frakoblet anlegg</SelectItem>
                <SelectItem value="NEAR_LIVE">Nær ved spenningssatt anlegg</SelectItem>
                <SelectItem value="LIVE_LOW_VOLTAGE">Arbeid under spenning – lavspenning</SelectItem>
                <SelectItem value="HIGH_VOLTAGE">Høyspenningsarbeid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3 pb-2">
            <Checkbox
              id="requiresSecondPerson"
              checked={requiresSecondPerson}
              onCheckedChange={(checked) => setRequiresSecondPerson(checked === true)}
            />
            <Label htmlFor="requiresSecondPerson">Krev person nummer to</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workMethod">Arbeidsmetode</Label>
            <Textarea id="workMethod" name="workMethod" defaultValue={initialData.workMethod} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredEquipment">Nødvendig utstyr</Label>
            <Textarea
              id="requiredEquipment"
              name="requiredEquipment"
              defaultValue={initialData.requiredEquipment}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredPpe">Personlig verneutstyr</Label>
            <Textarea id="requiredPpe" name="requiredPpe" defaultValue={initialData.requiredPpe} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personnelRequirements">Krav til personell</Label>
            <Textarea
              id="personnelRequirements"
              name="personnelRequirements"
              defaultValue={initialData.personnelRequirements}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="safetyConditions">Sikkerhetsbetingelser</Label>
            <Textarea
              id="safetyConditions"
              name="safetyConditions"
              defaultValue={initialData.safetyConditions}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {courseOptions.map((course) => (
            <label key={course.key} className="flex items-center gap-3 rounded-lg border bg-white p-3">
              <Checkbox
                checked={requiredCourseKeys.includes(course.key)}
                onCheckedChange={(checked) => toggleCourse(course.key, checked === true)}
              />
              <span className="text-sm font-medium">{course.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Farer og tiltak</h2>
            <p className="text-sm text-muted-foreground">Den ansatte kan tilpasse punktene til jobben.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setHazards((current) => [...current, { ...emptyHazard }])}
          >
            <Plus className="mr-2 h-4 w-4" /> Legg til fare
          </Button>
        </div>
        {hazards.map((hazard, index) => (
          <div key={index} className="space-y-4 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Fare {index + 1}</span>
              {hazards.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setHazards((current) => current.filter((_, hazardIndex) => hazardIndex !== index))
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={hazard.activity}
                onChange={(event) => updateHazard(index, { activity: event.target.value })}
                placeholder="Aktivitet *"
              />
              <Input
                value={hazard.hazard}
                onChange={(event) => updateHazard(index, { hazard: event.target.value })}
                placeholder="Fare *"
              />
              <Input
                value={hazard.consequence}
                onChange={(event) => updateHazard(index, { consequence: event.target.value })}
                placeholder="Mulig konsekvens"
              />
              <Input
                value={hazard.responsibleName}
                onChange={(event) => updateHazard(index, { responsibleName: event.target.value })}
                placeholder="Ansvarlig rolle"
              />
              <Select
                value={String(hazard.probability)}
                onValueChange={(value) => updateHazard(index, { probability: Number(value) })}
              >
                <SelectTrigger><SelectValue placeholder="Sannsynlighet" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <SelectItem key={value} value={String(value)}>Sannsynlighet {value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(hazard.severity)}
                onValueChange={(value) => updateHazard(index, { severity: Number(value) })}
              >
                <SelectTrigger><SelectValue placeholder="Konsekvens" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <SelectItem key={value} value={String(value)}>Konsekvens {value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={hazard.measures}
              onChange={(event) => updateHazard(index, { measures: event.target.value })}
              placeholder="Tiltak og barrierer *"
            />
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/sja/maler")}>
          Avbryt
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lagre mal
        </Button>
      </div>
    </form>
  );
}
