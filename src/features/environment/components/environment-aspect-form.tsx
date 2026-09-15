"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ControlFrequency,
  EnvironmentalAspect,
  EnvironmentalAspectCategory,
  EnvironmentalAspectStatus,
  EnvironmentalImpactType,
} from "@prisma/client";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  createEnvironmentalAspect,
  updateEnvironmentalAspect,
} from "@/server/actions/environment.actions";
import {
  ENVIRONMENT_CONTEXT_LABELS,
  ENVIRONMENT_LIFECYCLE_LABELS,
  ENVIRONMENT_LIFECYCLE_STAGES,
  parseLifecycleStages,
  type EnvironmentLifecycleStage,
} from "@/lib/environment-iso14001";

type UserOption = { id: string; name: string | null; email: string | null };
type GoalOption = { id: string; title: string };

interface EnvironmentAspectFormProps {
  tenantId: string;
  users: UserOption[];
  goals: GoalOption[];
  aspect?: EnvironmentalAspect;
  mode?: "create" | "edit";
  defaultOwnerId?: string;
}

const categoryOptions: Array<{ value: EnvironmentalAspectCategory; label: string }> = [
  { value: "RESOURCE_USE", label: "Ressursbruk" },
  { value: "ENERGY", label: "Energi" },
  { value: "WATER", label: "Vann" },
  { value: "WASTE", label: "Avfall" },
  { value: "EMISSIONS", label: "Utslipp" },
  { value: "BIODIVERSITY", label: "Biologisk mangfold" },
  { value: "OTHER", label: "Annet" },
];

const impactOptions: Array<{ value: EnvironmentalImpactType; label: string }> = [
  { value: "NEGATIVE", label: "Negativ påvirkning" },
  { value: "POSITIVE", label: "Positiv påvirkning" },
];

const frequencyOptions: Array<{ value: ControlFrequency; label: string }> = [
  { value: "WEEKLY", label: "Ukentlig" },
  { value: "MONTHLY", label: "Månedlig" },
  { value: "QUARTERLY", label: "Kvartalsvis" },
  { value: "ANNUAL", label: "Årlig" },
  { value: "BIENNIAL", label: "Annet hvert år" },
];

const statusOptions: Array<{ value: EnvironmentalAspectStatus; label: string }> = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "MONITORED", label: "Følges opp" },
  { value: "CLOSED", label: "Lukket" },
];

const NO_OWNER_VALUE = "__none_owner__";
const NO_GOAL_VALUE = "__none_goal__";
const NO_MONITORING_VALUE = "__none_frequency__";

const getSignificanceMeta = (score: number) => {
  if (score >= 20) {
    return { label: "Kritisk påvirkning", color: "text-red-900", bg: "bg-red-100 border-red-300" };
  }
  if (score >= 12) {
    return { label: "Høy påvirkning", color: "text-orange-900", bg: "bg-orange-100 border-orange-300" };
  }
  if (score >= 6) {
    return { label: "Moderat påvirkning", color: "text-yellow-900", bg: "bg-yellow-100 border-yellow-300" };
  }
  return { label: "Lav påvirkning", color: "text-green-900", bg: "bg-green-100 border-green-300" };
};

const toISODate = (value?: Date | string | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const emptyToUndefined = (value: FormDataEntryValue | null) => {
  if (!value) return undefined;
  const str = value.toString().trim();
  return str.length ? str : undefined;
};

export function EnvironmentAspectForm({
  tenantId,
  users,
  goals,
  aspect,
  mode = "create",
  defaultOwnerId,
}: EnvironmentAspectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState(aspect?.severity ?? 3);
  const [likelihood, setLikelihood] = useState(aspect?.likelihood ?? 3);
  const [impactType, setImpactType] = useState<EnvironmentalImpactType>(aspect?.impactType ?? "NEGATIVE");
  const [category, setCategory] = useState<EnvironmentalAspectCategory>(
    aspect?.category ?? "RESOURCE_USE"
  );
  const [status, setStatus] = useState<EnvironmentalAspectStatus>(aspect?.status ?? "ACTIVE");
  const [ownerId, setOwnerId] = useState(aspect?.ownerId ?? defaultOwnerId ?? NO_OWNER_VALUE);
  const [goalId, setGoalId] = useState(aspect?.goalId ?? NO_GOAL_VALUE);
  const [monitoringFrequency, setMonitoringFrequency] = useState<
    ControlFrequency | typeof NO_MONITORING_VALUE
  >(aspect?.monitoringFrequency ?? NO_MONITORING_VALUE);
  const [lifecycleStages, setLifecycleStages] = useState<EnvironmentLifecycleStage[]>(
    parseLifecycleStages(aspect?.lifecycleStages),
  );
  const [contextClimate, setContextClimate] = useState(aspect?.contextClimate ?? false);
  const [contextBiodiversity, setContextBiodiversity] = useState(aspect?.contextBiodiversity ?? false);
  const [contextResources, setContextResources] = useState(aspect?.contextResources ?? false);
  const [contextPollution, setContextPollution] = useState(aspect?.contextPollution ?? false);

  const significanceScore = severity * likelihood;
  const significanceMeta = getSignificanceMeta(significanceScore);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: formData.get("title") as string,
      description: emptyToUndefined(formData.get("description")),
      process: emptyToUndefined(formData.get("process")),
      location: emptyToUndefined(formData.get("location")),
      legalRequirement: emptyToUndefined(formData.get("legalRequirement")),
      controlMeasures: emptyToUndefined(formData.get("controlMeasures")),
      monitoringMethod: emptyToUndefined(formData.get("monitoringMethod")),
      severity,
      likelihood,
      category,
      impactType,
      monitoringFrequency: monitoringFrequency === NO_MONITORING_VALUE ? undefined : monitoringFrequency,
      ownerId: ownerId === NO_OWNER_VALUE ? undefined : ownerId,
      goalId: goalId === NO_GOAL_VALUE ? undefined : goalId,
      nextReviewDate: emptyToUndefined(formData.get("nextReviewDate")),
      status: mode === "edit" ? status : undefined,
      lifecycleStages,
      contextClimate,
      contextBiodiversity,
      contextResources,
      contextPollution,
    };

    try {
      const result =
        mode === "create"
          ? await createEnvironmentalAspect({ ...payload, tenantId })
          : await updateEnvironmentalAspect({ ...payload, id: aspect!.id });

      if (!result.success) {
        throw new Error(result.error || "Kunne ikke lagre miljøaspekt");
      }

      toast({
        title: mode === "create" ? "✅ Miljøaspekt opprettet" : "✅ Miljøaspekt oppdatert",
        description: mode === "create"
          ? "Miljøaspektet er registrert og klart for oppfølging"
          : "Endringene er lagret",
      });

      if (mode === "create" && result.data) {
        router.push(`/dashboard/environment/${result.data.id}`);
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: error.message || "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Miljøpåvirkning</CardTitle>
          <CardDescription>Klassifiser miljøaspektet og vurder betydningen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                name="title"
                placeholder="F.eks. Energiforbruk ved nattdrift"
                defaultValue={aspect?.title}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <Select value={category} onValueChange={(value: EnvironmentalAspectCategory) => setCategory(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="impactType">Påvirkningstype *</Label>
              <Select value={impactType} onValueChange={(value: EnvironmentalImpactType) => setImpactType(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg påvirkning" />
                </SelectTrigger>
                <SelectContent>
                  {impactOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerId">Ansvarlig</Label>
              <Select value={ownerId} onValueChange={setOwnerId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansvarlig" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_OWNER_VALUE}>Ikke satt</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goalId">Knytt til miljømål</Label>
              <Select value={goalId} onValueChange={setGoalId} disabled={loading || goals.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={goals.length ? "Velg mål (valgfritt)" : "Ingen mål tilgjengelig"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GOAL_VALUE}>Ikke satt</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">Neste revisjon</Label>
              <Input
                id="nextReviewDate"
                name="nextReviewDate"
                type="date"
                defaultValue={toISODate(aspect?.nextReviewDate)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Konsekvens (1-5)</Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[severity]}
                onValueChange={([value]) => setSeverity(value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">Verdi: {severity}</p>
            </div>
            <div className="space-y-2">
              <Label>Sannsynlighet (1-5)</Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[likelihood]}
                onValueChange={([value]) => setLikelihood(value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">Verdi: {likelihood}</p>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${significanceMeta.bg}`}>
            <p className={`text-sm font-medium ${significanceMeta.color}`}>
              Betydning: {significanceScore} ({significanceMeta.label})
            </p>
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: EnvironmentalAspectStatus) => setStatus(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beskrivelse og kontekst</CardTitle>
          <CardDescription>Hvor oppstår påvirkningen og hvilke prosesser berøres?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Beskriv hva som forårsaker påvirkningen og hvilke ressurser som berøres"
              defaultValue={aspect?.description ?? ""}
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="process">Prosess</Label>
              <Input
                id="process"
                name="process"
                placeholder="F.eks. Produksjon, Logistikk"
                defaultValue={aspect?.process ?? ""}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lokasjon</Label>
              <Input
                id="location"
                name="location"
                placeholder="F.eks. Bygg A, Lager 2"
                defaultValue={aspect?.location ?? ""}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Livsløp og miljøforhold</CardTitle>
          <CardDescription>
            ISO 14001:2026 6.1.2 og 4.1 – hvor i livsløpet aspektet oppstår, og hvilke forhold det berører
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Livsløpstrinn</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ENVIRONMENT_LIFECYCLE_STAGES.map((stage) => (
                <label key={stage} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={lifecycleStages.includes(stage)}
                    onCheckedChange={(checked) => {
                      setLifecycleStages((prev) =>
                        checked ? [...prev, stage] : prev.filter((item) => item !== stage),
                      );
                    }}
                    disabled={loading}
                  />
                  {ENVIRONMENT_LIFECYCLE_LABELS[stage]}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Relevante miljøforhold</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={contextClimate}
                  onCheckedChange={(checked) => setContextClimate(Boolean(checked))}
                  disabled={loading}
                />
                {ENVIRONMENT_CONTEXT_LABELS.climate}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={contextBiodiversity}
                  onCheckedChange={(checked) => setContextBiodiversity(Boolean(checked))}
                  disabled={loading}
                />
                {ENVIRONMENT_CONTEXT_LABELS.biodiversity}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={contextResources}
                  onCheckedChange={(checked) => setContextResources(Boolean(checked))}
                  disabled={loading}
                />
                {ENVIRONMENT_CONTEXT_LABELS.resources}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={contextPollution}
                  onCheckedChange={(checked) => setContextPollution(Boolean(checked))}
                  disabled={loading}
                />
                {ENVIRONMENT_CONTEXT_LABELS.pollution}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontroller og overvåking</CardTitle>
          <CardDescription>Definer tiltak og hvordan påvirkningen måles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legalRequirement">Myndighetskrav</Label>
            <Textarea
              id="legalRequirement"
              name="legalRequirement"
              placeholder="Henvis til lov/krav eller andre forpliktelser"
              defaultValue={aspect?.legalRequirement ?? ""}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="controlMeasures">Kontrolltiltak</Label>
            <Textarea
              id="controlMeasures"
              name="controlMeasures"
              placeholder="Hvilke barrierer og rutiner reduserer påvirkningen?"
              defaultValue={aspect?.controlMeasures ?? ""}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="monitoringMethod">Målemetode</Label>
              <Input
                id="monitoringMethod"
                name="monitoringMethod"
                placeholder="F.eks. Energimåler, Lab-analyse, Visuell inspeksjon"
                defaultValue={aspect?.monitoringMethod ?? ""}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitoringFrequency">Oppfølgingsfrekvens</Label>
              <Select
                value={monitoringFrequency}
                onValueChange={(value) => setMonitoringFrequency(value as ControlFrequency | typeof NO_MONITORING_VALUE)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg frekvens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MONITORING_VALUE}>Ikke satt</SelectItem>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : mode === "create" ? "Opprett miljøaspekt" : "Lagre endringer"}
        </Button>
      </div>
    </form>
  );
}

