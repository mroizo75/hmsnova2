"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  GripVertical,
  Camera,
  X,
  CloudSun,
  Users,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getRiskColor, getRiskLabel } from "@/features/sja/schemas/sja.schema";
import Image from "next/image";
import { generateAiSjaSummary } from "@/server/actions/ai-assistant.actions";

interface HazardRow {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
  responsibleName: string;
}

const emptyHazard: HazardRow = {
  activity: "",
  hazard: "",
  consequence: "",
  probability: 1,
  severity: 1,
  measures: "",
  responsibleName: "",
};

interface SjaFormProps {
  tenantId: string;
  userName: string;
  projectId?: string;
  projects?: Array<{
    id: string;
    name: string;
    location?: string | null;
  }>;
  onSuccess?: () => void;
  successRedirectPath?: string;
  initialData?: {
    title: string;
    description: string;
    workLocation: string;
    participants: string;
    hazards: HazardRow[];
    templateId?: string;
    templateName?: string;
  };
}

export function SjaForm({
  tenantId,
  userName,
  projectId,
  projects = [],
  onSuccess,
  successRedirectPath = "/ansatt/sja",
  initialData,
}: SjaFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "__none__");
  const [hazards, setHazards] = useState<HazardRow[]>(
    initialData?.hazards ?? [{ ...emptyHazard }]
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState("");

  function addHazard() {
    setHazards([...hazards, { ...emptyHazard }]);
  }

  function removeHazard(index: number) {
    if (hazards.length <= 1) return;
    setHazards(hazards.filter((_, i) => i !== index));
  }

  function updateHazard(index: number, field: keyof HazardRow, value: string | number) {
    const updated = [...hazards];
    (updated[index] as any)[field] = value;
    setHazards(updated);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImageFiles = [...imageFiles, ...files].slice(0, 5);
      setImageFiles(newImageFiles);
      const previews = newImageFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  }

  function removeImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const participants = (formData.get("participants") as string)?.trim();

    if (!participants) {
      toast({
        title: "Deltakere mangler",
        description: "Alle som deltar i arbeidet må registreres.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const validHazards = hazards.filter(
      (h) => h.activity.trim() && h.hazard.trim() && h.measures.trim()
    );

    if (validHazards.length === 0) {
      toast({
        title: "Ingen farer registrert",
        description: "Legg til minst én fare med aktivitet, fare og tiltak.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const plannedDateStr = formData.get("plannedDate") as string;
    if (!plannedDateStr) {
      toast({
        title: "Dato mangler",
        description: "Velg dato for når arbeidet skal utføres.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      tenantId,
      projectId: selectedProjectId === "__none__" ? undefined : selectedProjectId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      workLocation: formData.get("workLocation") as string,
      plannedDate: new Date(plannedDateStr).toISOString(),
      responsibleName: userName,
      participants,
      additionalConditions: formData.get("additionalConditions") as string,
      weatherConditions: formData.get("weatherConditions") as string,
      templateId: initialData?.templateId,
      templateName: initialData?.templateName,
      hazards: validHazards.map((h, i) => ({
        ...h,
        sortOrder: i,
      })),
    };

    try {
      const { createSjaAnalysis } = await import("@/server/actions/sja.actions");
      const result = await createSjaAnalysis(payload);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (imageFiles.length > 0 && result.data?.id) {
        const uploadData = new FormData();
        uploadData.append("tenantId", tenantId);
        uploadData.append("sjaAnalysisId", result.data.id);
        imageFiles.forEach((file) => {
          uploadData.append("images", file);
        });

        await fetch("/api/sja/upload", {
          method: "POST",
          body: uploadData,
        });
      }

      toast({
        title: "SJA innsendt",
        description: "Sikker jobb-analysen er registrert og klar for godkjenning.",
      });

      if (onSuccess) {
        onSuccess();
      } else if (
        selectedProjectId !== "__none__" &&
        successRedirectPath === "/dashboard/sja"
      ) {
        router.push(`/dashboard/projects/${selectedProjectId}`);
      } else {
        router.push(successRedirectPath);
      }
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke opprette SJA. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateSummary() {
    const title = (document.getElementById("title") as HTMLInputElement | null)?.value || "";
    const workLocation = (document.getElementById("workLocation") as HTMLInputElement | null)?.value || "";
    const participants = (document.getElementById("participants") as HTMLTextAreaElement | null)?.value || "";
    const validHazards = hazards.filter(
      (item) => item.activity.trim() && item.hazard.trim() && item.measures.trim()
    );
    if (!title || !workLocation || !participants || validHazards.length === 0) {
      toast({
        variant: "destructive",
        title: "Mangler grunnlag",
        description: "Fyll ut tittel, sted, deltakere og minst én fare før AI-oppsummering.",
      });
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const result = await generateAiSjaSummary({
        title,
        workLocation,
        participants,
        hazards: validHazards.map((item) => ({
          activity: item.activity,
          hazard: item.hazard,
          consequence: item.consequence,
          measures: item.measures,
        })),
      });
      if (!result.success || !result.data) {
        toast({
          variant: "destructive",
          title: "AI-oppsummering feilet",
          description: result.error || "Ukjent feil",
        });
        return;
      }
      setAiSummary(result.data.summary);
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* === SEKSJON 1: Generell informasjon === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">1. Generell informasjon</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base">
              Arbeidsoppgave / Tittel *
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks: Arbeid i høyden – tak bygg C"
              required
              defaultValue={initialData?.title}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedDate" className="text-base">
              Dato for arbeidet *
            </Label>
            <Input
              id="plannedDate"
              name="plannedDate"
              type="date"
              required
              defaultValue={today}
              className="h-12 text-base"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projects.length > 0 ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="projectId" className="text-base">
                Prosjekt
              </Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="projectId" className="h-12 text-base">
                  <SelectValue placeholder="Velg prosjekt (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ingen prosjektkobling</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.location ? ` - ${project.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="workLocation" className="text-base">
              Arbeidssted *
            </Label>
            <Input
              id="workLocation"
              name="workLocation"
              placeholder="F.eks: Bygg C, 3. etasje, tak"
              required
              defaultValue={initialData?.workLocation}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weatherConditions" className="text-base flex items-center gap-1">
              <CloudSun className="h-4 w-4" />
              Værforhold
            </Label>
            <Input
              id="weatherConditions"
              name="weatherConditions"
              placeholder="F.eks: Regn, vind 10 m/s, glatt"
              className="h-12 text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base">
            Beskrivelse av arbeidet
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Beskriv arbeidet som skal utføres..."
            defaultValue={initialData?.description}
            rows={3}
            className="text-base resize-none"
          />
        </div>
      </div>

      {/* === SEKSJON 2: Deltakere === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          2. Deltakere
        </h3>

        <div className="space-y-2">
          <Label htmlFor="participants" className="text-base">
            Alle som deltar i arbeidet *
          </Label>
          <Textarea
            id="participants"
            name="participants"
            placeholder="Skriv navn på alle deltakere, én per linje. Alle som deltar i arbeidet SKAL registreres."
            defaultValue={initialData?.participants}
            rows={3}
            required
            className="text-base resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Alle deltakere bekrefter at de har gjennomgått SJA-en og forstått farene og tiltakene
          </p>
        </div>
      </div>

      {/* === SEKSJON 3: Spesielle forhold === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          3. Spesielle forhold i dag
        </h3>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-900 mb-3">
              <strong>Tenk gjennom:</strong> Er det noe som er annerledes i dag? Nye folk,
              endret utstyr, dårlig vær, tidspress, samarbeid med andre firma, endrede planer?
            </p>
            <Textarea
              id="additionalConditions"
              name="additionalConditions"
              placeholder="Beskriv eventuelle spesielle forhold, endringer eller tilleggsrisikoer som gjelder i dag..."
              rows={3}
              className="text-base resize-none bg-white"
            />
          </CardContent>
        </Card>
      </div>

      {/* === SEKSJON 4: Fareidentifikasjon === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          4. Fareidentifikasjon og tiltak
        </h3>

        {initialData?.templateName && (
          <p className="text-sm text-muted-foreground">
            Forhåndsutfylt fra mal. Gjennomgå alle punkter – legg til eller fjern etter behov.
          </p>
        )}

        <div className="space-y-6">
          {hazards.map((hazard, index) => (
            <div
              key={index}
              className="relative border rounded-lg p-4 space-y-4 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Fare #{index + 1}
                  </span>
                  {hazard.probability > 0 && hazard.severity > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskColor(
                        hazard.probability * hazard.severity
                      )}`}
                    >
                      Risiko: {hazard.probability * hazard.severity} –{" "}
                      {getRiskLabel(hazard.probability * hazard.severity)}
                    </span>
                  )}
                </div>
                {hazards.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHazard(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm">Aktivitet / arbeidsoperasjon *</Label>
                  <Input
                    value={hazard.activity}
                    onChange={(e) => updateHazard(index, "activity", e.target.value)}
                    placeholder="Hva skal gjøres?"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Fare / risiko *</Label>
                  <Input
                    value={hazard.hazard}
                    onChange={(e) => updateHazard(index, "hazard", e.target.value)}
                    placeholder="Hva kan gå galt?"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Mulig konsekvens</Label>
                <Input
                  value={hazard.consequence}
                  onChange={(e) => updateHazard(index, "consequence", e.target.value)}
                  placeholder="Hva er verst tenkelig utfall?"
                  className="text-sm"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-sm">Sannsynlighet (1–5)</Label>
                  <Select
                    value={String(hazard.probability)}
                    onValueChange={(v) => updateHazard(index, "probability", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 – Svært lav</SelectItem>
                      <SelectItem value="2">2 – Lav</SelectItem>
                      <SelectItem value="3">3 – Middels</SelectItem>
                      <SelectItem value="4">4 – Høy</SelectItem>
                      <SelectItem value="5">5 – Svært høy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Konsekvens (1–5)</Label>
                  <Select
                    value={String(hazard.severity)}
                    onValueChange={(v) => updateHazard(index, "severity", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 – Ubetydelig</SelectItem>
                      <SelectItem value="2">2 – Liten</SelectItem>
                      <SelectItem value="3">3 – Moderat</SelectItem>
                      <SelectItem value="4">4 – Alvorlig</SelectItem>
                      <SelectItem value="5">5 – Svært alvorlig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Ansvarlig for tiltak</Label>
                  <Input
                    value={hazard.responsibleName}
                    onChange={(e) => updateHazard(index, "responsibleName", e.target.value)}
                    placeholder="Hvem er ansvarlig?"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Tiltak / barrierer *</Label>
                <Textarea
                  value={hazard.measures}
                  onChange={(e) => updateHazard(index, "measures", e.target.value)}
                  placeholder="Hvilke tiltak skal iverksettes for å redusere risikoen?"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full" onClick={addHazard}>
            <Plus className="h-4 w-4 mr-2" />
            Legg til flere farer
          </Button>
        </div>
      </div>

      {/* === SEKSJON 5: Bilder === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <Camera className="h-5 w-5" />
          5. Bilder av arbeidsområdet
        </h3>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ta bilder av arbeidsområdet, utstyr eller forhold som er relevante for SJA-en (valgfritt, maks 5)
          </p>
          <div className="relative">
            <Input
              id="images"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleImageChange}
              disabled={imageFiles.length >= 5}
              className="sr-only"
            />
            <Label
              htmlFor="images"
              className={`
                flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-lg cursor-pointer
                transition-colors hover:bg-gray-50
                ${imageFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {imageFiles.length >= 5 ? "Maks 5 bilder" : "Ta bilde eller velg fra album"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {imageFiles.length > 0 ? `${imageFiles.length}/5 bilder lagt til` : "Valgfritt"}
                </p>
              </div>
            </Label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={preview}
                    alt={`Bilde ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === SEKSJON 6: Bekreftelse og innsending === */}
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-green-900">
            6. Bekreftelse og innsending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-900">
            Ved å sende inn bekrefter du at:
          </p>
          <ul className="list-disc list-inside text-sm text-green-800 space-y-1 ml-2">
            <li>Alle deltakere har gjennomgått denne SJA-en sammen</li>
            <li>Alle identifiserte farer er vurdert</li>
            <li>Nødvendige tiltak er beskrevet og forstått</li>
            <li>Alle vet hvem som er ansvarlig for hvert tiltak</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI-oppsummering
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
            {isGeneratingSummary ? "Genererer..." : "Generer oppsummering"}
          </Button>
          <Textarea
            value={aiSummary}
            onChange={(event) => setAiSummary(event.target.value)}
            placeholder="AI-oppsummering av hovedfarer, tiltak og oppfølging vises her."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="w-full h-14 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sender inn SJA...
            </>
          ) : (
            "Send inn SJA for godkjenning"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          size="lg"
          className="w-full h-12"
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
