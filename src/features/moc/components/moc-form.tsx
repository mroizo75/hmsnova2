"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createMoc } from "@/server/actions/moc.actions";
import { mocChangeTypes } from "@/features/moc/schemas/moc.schema";
import {
  MOC_TYPE_LABELS,
  MOC_CLASSIFICATION_LABELS,
  MOC_DURATION_LABELS,
  MOC_SOURCE_LABELS,
} from "@/lib/moc-labels";

interface MocFormProps {
  projects: Array<{ id: string; name: string; code: string | null }>;
  successPath?: string;
}

export function MocForm({ projects, successPath = "/dashboard/moc" }: MocFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changeType, setChangeType] = useState<(typeof mocChangeTypes)[number]>("PROCESS");
  const [classification, setClassification] = useState<"MINOR" | "SIGNIFICANT" | "MAJOR">("MINOR");
  const [duration, setDuration] = useState<"TEMPORARY" | "PERMANENT">("PERMANENT");
  const [source, setSource] = useState<"PLANNED" | "UNINTENDED">("PLANNED");
  const [hseImpact, setHseImpact] = useState("");
  const [environmentalImpact, setEnvironmentalImpact] = useState("");
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [plannedEndAt, setPlannedEndAt] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [projectId, setProjectId] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await createMoc({
      title,
      description,
      changeType,
      duration,
      source,
      classification,
      hseImpact,
      environmentalImpact,
      plannedStartAt: plannedStartAt || undefined,
      plannedEndAt: plannedEndAt || undefined,
      rollbackPlan: rollbackPlan || undefined,
      projectId: projectId || undefined,
    });
    setSaving(false);

    if (result.success === false) {
      toast({ title: "Kunne ikke opprette", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Endringssak opprettet", description: result.data?.number });
    router.push(`${successPath}/${result.data?.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Tittel</Label>
        <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beskrivelse</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          minLength={10}
          rows={4}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Type endring</Label>
          <Select value={changeType} onValueChange={(value) => setChangeType(value as typeof changeType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mocChangeTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {MOC_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Klassifisering</Label>
          <Select
            value={classification}
            onValueChange={(value) => setClassification(value as typeof classification)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MOC_CLASSIFICATION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Varighet</Label>
          <Select value={duration} onValueChange={(value) => setDuration(value as typeof duration)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MOC_DURATION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kilde</Label>
          <Select value={source} onValueChange={(value) => setSource(value as typeof source)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MOC_SOURCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hseImpact">HMS-konsekvens</Label>
        <Textarea
          id="hseImpact"
          value={hseImpact}
          onChange={(event) => setHseImpact(event.target.value)}
          required
          minLength={5}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="environmentalImpact">Konsekvens for ytre miljø</Label>
        <Textarea
          id="environmentalImpact"
          value={environmentalImpact}
          onChange={(event) => setEnvironmentalImpact(event.target.value)}
          required
          minLength={5}
          rows={3}
          placeholder="Beskriv påvirkning på klima, natur, ressurser eller forurensning, eller dokumenter at den ikke er vesentlig. ISO 14001:2026 6.3."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plannedStartAt">Planlagt start</Label>
          <Input
            id="plannedStartAt"
            type="date"
            value={plannedStartAt}
            onChange={(event) => setPlannedStartAt(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plannedEndAt">
            Planlagt slutt{duration === "TEMPORARY" ? " (påkrevd før godkjenning)" : ""}
          </Label>
          <Input
            id="plannedEndAt"
            type="date"
            value={plannedEndAt}
            onChange={(event) => setPlannedEndAt(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rollbackPlan">Tilbakeføringsplan (midlertidige endringer)</Label>
        <Textarea
          id="rollbackPlan"
          value={rollbackPlan}
          onChange={(event) => setRollbackPlan(event.target.value)}
          rows={2}
        />
      </div>
      {projects.length > 0 && (
        <div className="space-y-2">
          <Label>Prosjekt</Label>
          <Select value={projectId || "__none__"} onValueChange={(value) => setProjectId(value === "__none__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Valgfritt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Ingen</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                  {project.code ? ` (${project.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Oppretter..." : "Foreslå endring"}
      </Button>
    </form>
  );
}
