"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SubcategoryOption {
  id: string;
  key: string;
  label: string;
  industry: string;
}

interface IncidentTreatmentFormProps {
  incidentId: string;
  currentType: string;
  currentSubcategoryKeys: string[];
  currentProjectId: string | null;
  currentStatus: string;
  currentSeverity: number;
  currentResponsibleId: string | null;
  currentMedicalAttentionRequired: boolean;
  currentIsFatal: boolean;
  currentIsLostTimeIncident: boolean;
  currentLostWorkdays: number | null;
  currentIsRestrictedWork: boolean;
  currentIsFirstAidCase: boolean;
  currentIsProductionStop: boolean;
  currentProductionStopHours: number | null;
  currentIsPropertyDamage: boolean;
  currentEstimatedDamageCost: number | null;
  currentIsEnvironmentalRelease: boolean;
  currentEnvironmentalDescription: string | null;
  currentSource: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  projects: Array<{ id: string; name: string; code: string | null; status: string }>;
}

const NO_PROJECT_VALUE = "__none_project__";

export function IncidentTreatmentForm({
  incidentId,
  currentType,
  currentSubcategoryKeys,
  currentProjectId,
  currentStatus,
  currentSeverity,
  currentResponsibleId,
  currentMedicalAttentionRequired,
  currentIsFatal,
  currentIsLostTimeIncident,
  currentLostWorkdays,
  currentIsRestrictedWork,
  currentIsFirstAidCase,
  currentIsProductionStop,
  currentProductionStopHours,
  currentIsPropertyDamage,
  currentEstimatedDamageCost,
  currentIsEnvironmentalRelease,
  currentEnvironmentalDescription,
  currentSource,
  users,
  projects,
}: IncidentTreatmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [type, setType] = useState(currentType);
  const [source, setSource] = useState(currentSource || "INTERNAL");
  const [subcategoryOptions, setSubcategoryOptions] = useState<SubcategoryOption[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    currentSubcategoryKeys
  );
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [severity, setSeverity] = useState(currentSeverity.toString());
  const [projectId, setProjectId] = useState(currentProjectId ?? NO_PROJECT_VALUE);
  const [responsibleId, setResponsibleId] = useState(currentResponsibleId || "NONE");
  const [medicalAttentionRequired, setMedicalAttentionRequired] = useState(currentMedicalAttentionRequired);
  const [isFatal, setIsFatal] = useState(currentIsFatal);
  const [isLostTimeIncident, setIsLostTimeIncident] = useState(currentIsLostTimeIncident);
  const [lostWorkdays, setLostWorkdays] = useState(
    typeof currentLostWorkdays === "number" ? currentLostWorkdays.toString() : ""
  );
  const [isRestrictedWork, setIsRestrictedWork] = useState(currentIsRestrictedWork);
  const [isFirstAidCase, setIsFirstAidCase] = useState(currentIsFirstAidCase);
  const [isProductionStop, setIsProductionStop] = useState(currentIsProductionStop);
  const [productionStopHours, setProductionStopHours] = useState(
    typeof currentProductionStopHours === "number" ? currentProductionStopHours.toString() : ""
  );
  const [isPropertyDamage, setIsPropertyDamage] = useState(currentIsPropertyDamage);
  const [estimatedDamageCost, setEstimatedDamageCost] = useState(
    typeof currentEstimatedDamageCost === "number" ? currentEstimatedDamageCost.toString() : ""
  );
  const [isEnvironmentalRelease, setIsEnvironmentalRelease] = useState(currentIsEnvironmentalRelease);
  const [environmentalDescription, setEnvironmentalDescription] = useState(
    currentEnvironmentalDescription ?? ""
  );
  const requiresHseCompletion = status !== "OPEN";
  const lostWorkdaysValue = lostWorkdays.trim();
  const isLostWorkdaysInvalid =
    requiresHseCompletion && isLostTimeIncident && lostWorkdaysValue.length === 0;
  const isFormInvalid = isUpdating || isLostWorkdaysInvalid;
  const normalizedInitialSubcategories = useMemo(
    () => [...currentSubcategoryKeys].sort().join("|"),
    [currentSubcategoryKeys]
  );
  const normalizedSelectedSubcategories = useMemo(
    () => [...selectedSubcategories].sort().join("|"),
    [selectedSubcategories]
  );

  useEffect(() => {
    let isMounted = true;
    const fetchSubcategories = async () => {
      setLoadingSubcategories(true);
      try {
        const response = await fetch(`/api/incidents/subcategories?type=${type}`);
        if (!response.ok) {
          if (isMounted) {
            setSubcategoryOptions([]);
          }
          return;
        }
        const data = (await response.json()) as { options?: SubcategoryOption[] };
        if (!isMounted) {
          return;
        }
        const options = data.options ?? [];
        setSubcategoryOptions(options);
        setSelectedSubcategories((previous) =>
          previous.filter((key) => options.some((option) => option.key === key))
        );
      } catch {
        if (isMounted) {
          setSubcategoryOptions([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSubcategories(false);
        }
      }
    };

    fetchSubcategories();

    return () => {
      isMounted = false;
    };
  }, [type]);

  function toggleSubcategory(key: string) {
    setSelectedSubcategories((previous) =>
      previous.includes(key)
        ? previous.filter((existingKey) => existingKey !== key)
        : [...previous, key]
    );
  }

  async function handleUpdate() {
    if (isLostWorkdaysInvalid) {
      toast({
        title: "Manglende HSE-data",
        description: "Fyll ut fravaersdager naar fravaersskade er valgt.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/incidents/${incidentId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subcategoryKeys: selectedSubcategories,
          projectId: projectId === NO_PROJECT_VALUE ? null : projectId,
          status,
          severity: parseInt(severity, 10),
          responsibleId: responsibleId === "NONE" ? null : responsibleId,
          medicalAttentionRequired,
          isFatal,
          isLostTimeIncident,
          lostWorkdays: lostWorkdaysValue.length > 0 ? parseInt(lostWorkdaysValue, 10) : null,
          isRestrictedWork,
          isFirstAidCase,
          isProductionStop,
          productionStopHours: productionStopHours.trim().length > 0 ? parseFloat(productionStopHours) : null,
          isPropertyDamage,
          estimatedDamageCost: estimatedDamageCost.trim().length > 0 ? parseFloat(estimatedDamageCost) : null,
          isEnvironmentalRelease,
          environmentalDescription: environmentalDescription.trim() || null,
          source,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke oppdatere avvik");
      }

      toast({
        title: "✅ Oppdatert",
        description: "Avviket er oppdatert",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "❌ Feil",
        description: "Kunne ikke oppdatere avvik. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  const hasChanges =
    type !== currentType ||
    normalizedSelectedSubcategories !== normalizedInitialSubcategories ||
    projectId !== (currentProjectId ?? NO_PROJECT_VALUE) ||
    status !== currentStatus ||
    severity !== currentSeverity.toString() ||
    responsibleId !== (currentResponsibleId || "NONE") ||
    medicalAttentionRequired !== currentMedicalAttentionRequired ||
    isFatal !== currentIsFatal ||
    isLostTimeIncident !== currentIsLostTimeIncident ||
    lostWorkdays !== (typeof currentLostWorkdays === "number" ? currentLostWorkdays.toString() : "") ||
    isRestrictedWork !== currentIsRestrictedWork ||
    isFirstAidCase !== currentIsFirstAidCase ||
    isProductionStop !== currentIsProductionStop ||
    productionStopHours !== (typeof currentProductionStopHours === "number" ? currentProductionStopHours.toString() : "") ||
    isPropertyDamage !== currentIsPropertyDamage ||
    estimatedDamageCost !== (typeof currentEstimatedDamageCost === "number" ? currentEstimatedDamageCost.toString() : "") ||
    isEnvironmentalRelease !== currentIsEnvironmentalRelease ||
    environmentalDescription !== (currentEnvironmentalDescription ?? "") ||
    source !== (currentSource || "INTERNAL");

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Hendelsestype</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ULYKKE">Arbeidsulykke / RUH</SelectItem>
              <SelectItem value="NESTEN">Nestenulykke / RUH</SelectItem>
              <SelectItem value="FARLIG_SITUASJON">Farlig situasjon / Observasjon</SelectItem>
              <SelectItem value="YRKESSYKDOM">Yrkessykdom</SelectItem>
              <SelectItem value="AVVIK">Avvik</SelectItem>
              <SelectItem value="MILJO">Miljoavvik</SelectItem>
              <SelectItem value="KVALITET">Kvalitetsavvik</SelectItem>
              <SelectItem value="CUSTOMER">Kundeklage</SelectItem>
              <SelectItem value="HMS">HMS-avvik (legacy)</SelectItem>
              <SelectItem value="SKADE">Personskade (legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Åpen</SelectItem>
              <SelectItem value="INVESTIGATING">Under utredning</SelectItem>
              <SelectItem value="ACTION_TAKEN">Tiltak igangsatt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Alvorlighet</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Ubetydelig</SelectItem>
              <SelectItem value="2">2 - Liten</SelectItem>
              <SelectItem value="3">3 - Moderat</SelectItem>
              <SelectItem value="4">4 - Alvorlig</SelectItem>
              <SelectItem value="5">5 - Kritisk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Kilde</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL">Intern</SelectItem>
              <SelectItem value="EXTERNAL">Ekstern</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Knyttet prosjekt</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Velg prosjekt (valgfritt)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PROJECT_VALUE}>Ingen / ikke prosjektrelatert</SelectItem>
            {projects
              .filter((project) => project.status === "ACTIVE" || project.status === "PLANNING")
              .map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                  {project.code ? ` (${project.code})` : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">Ansvarlig for oppfølging</Label>
        <Select value={responsibleId} onValueChange={setResponsibleId}>
          <SelectTrigger>
            <SelectValue placeholder="Velg ansvarlig..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Ingen tildelt</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Label className="block">
          Hendelsen dreier seg om
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (velg en eller flere)
          </span>
        </Label>
        {loadingSubcategories ? (
          <p className="text-xs text-muted-foreground">Laster kategorier...</p>
        ) : subcategoryOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Ingen underkategorier for valgt hendelsestype.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 rounded-lg border bg-muted/30 p-3">
            {subcategoryOptions.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-2 select-none"
              >
                <Checkbox
                  checked={selectedSubcategories.includes(option.key)}
                  onCheckedChange={() => toggleSubcategory(option.key)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <Label className="block font-semibold">HSE-statistikk (TRIR)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Klassifiser hendelsen for HMS-rapportering. Ved behandling (status ulik &quot;Åpen&quot;) skal HSE-felter fylles ut.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isFatal}
              onCheckedChange={(checked) => setIsFatal(!!checked)}
            />
            <span className="text-sm">Dødsfall</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={medicalAttentionRequired}
              onCheckedChange={(checked) => setMedicalAttentionRequired(!!checked)}
            />
            <span className="text-sm">Legebehandling</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isLostTimeIncident}
              onCheckedChange={(checked) => {
                const nextValue = !!checked;
                setIsLostTimeIncident(nextValue);
                if (!nextValue) {
                  setLostWorkdays("");
                }
              }}
            />
            <span className="text-sm">Fraværsskade (LTI)</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isRestrictedWork}
              onCheckedChange={(checked) => setIsRestrictedWork(!!checked)}
            />
            <span className="text-sm">Begrenset arbeid</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isFirstAidCase}
              onCheckedChange={(checked) => setIsFirstAidCase(!!checked)}
            />
            <span className="text-sm">Førstehjelp gitt</span>
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lostWorkdays">Fraværsdager</Label>
          <Input
            id="lostWorkdays"
            type="number"
            min={0}
            value={lostWorkdays}
            onChange={(event) => setLostWorkdays(event.target.value)}
            disabled={!isLostTimeIncident}
            placeholder="Antall fraværsdager"
          />
          {isLostWorkdaysInvalid && (
            <p className="text-xs text-red-600">
              Fraværsdager må fylles ut når fraværsskade er valgt.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <Label className="block font-semibold">Produksjon og materiell</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Registrer eventuelle konsekvenser for produksjon, utstyr eller miljø.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isProductionStop}
              onCheckedChange={(checked) => {
                const nextValue = !!checked;
                setIsProductionStop(nextValue);
                if (!nextValue) setProductionStopHours("");
              }}
            />
            <span className="text-sm">Produksjonsstopp</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isPropertyDamage}
              onCheckedChange={(checked) => {
                const nextValue = !!checked;
                setIsPropertyDamage(nextValue);
                if (!nextValue) setEstimatedDamageCost("");
              }}
            />
            <span className="text-sm">Materiell skade</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isEnvironmentalRelease}
              onCheckedChange={(checked) => {
                const nextValue = !!checked;
                setIsEnvironmentalRelease(nextValue);
                if (!nextValue) setEnvironmentalDescription("");
              }}
            />
            <span className="text-sm">Miljøutslipp</span>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="productionStopHours">Timer produksjonsstopp</Label>
            <Input
              id="productionStopHours"
              type="number"
              min={0}
              step={0.5}
              value={productionStopHours}
              onChange={(event) => setProductionStopHours(event.target.value)}
              disabled={!isProductionStop}
              placeholder="F.eks. 4.5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedDamageCost">Estimert skadekostnad (NOK)</Label>
            <Input
              id="estimatedDamageCost"
              type="number"
              min={0}
              step={100}
              value={estimatedDamageCost}
              onChange={(event) => setEstimatedDamageCost(event.target.value)}
              disabled={!isPropertyDamage}
              placeholder="F.eks. 50000"
            />
          </div>
        </div>

        {isEnvironmentalRelease && (
          <div className="space-y-2">
            <Label htmlFor="environmentalDescription">Beskrivelse av miljøutslipp</Label>
            <Input
              id="environmentalDescription"
              value={environmentalDescription}
              onChange={(event) => setEnvironmentalDescription(event.target.value)}
              placeholder="Type utslipp, mengde, og konsekvens"
            />
          </div>
        )}
      </div>

      {hasChanges && (
        <Button onClick={handleUpdate} disabled={isFormInvalid} className="w-full">
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Oppdaterer...
            </>
          ) : (
            "💾 Lagre endringer"
          )}
        </Button>
      )}
    </div>
  );
}

