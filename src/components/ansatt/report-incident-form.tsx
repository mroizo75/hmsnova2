"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Camera, X } from "lucide-react";
import Image from "next/image";

const NO_PROJECT = "__none__";
type IncidentContext = "general" | "homeVisitRisk" | "infectionExposure" | "medicationNearMiss" | "violenceThreat";

interface SubcategoryOption {
  id: string;
  key: string;
  label: string;
  industry: string;
}

interface IncidentContextPreset {
  type: string;
  subcategoryMatchTerms: string[];
  titlePlaceholder: string;
  detailsLabel?: string;
  detailsPlaceholder?: string;
}

export function ReportIncidentForm({
  tenantId,
  reportedBy,
  projects = [],
  successRedirectPath = "/ansatt/avvik/takk",
  isHealthcareTenant = false,
}: {
  tenantId: string;
  reportedBy: string;
  projects?: Array<{ id: string; name: string; code: string | null }>;
  successRedirectPath?: string;
  isHealthcareTenant?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(NO_PROJECT);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [incidentContext, setIncidentContext] = useState<IncidentContext>("general");
  const [selectedType, setSelectedType] = useState<string>("AVVIK");
  const [contextDetails, setContextDetails] = useState("");
  const [subcategoryOptions, setSubcategoryOptions] = useState<SubcategoryOption[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [selectedSubcategoryKeys, setSelectedSubcategoryKeys] = useState<string[]>([]);

  const contextPresets = useMemo<Record<IncidentContext, IncidentContextPreset>>(
    () => ({
      general: {
        type: "AVVIK",
        subcategoryMatchTerms: [],
        titlePlaceholder: "F.eks: Våt gulv uten varsling",
      },
      homeVisitRisk: {
        type: "FARLIG_SITUASJON",
        subcategoryMatchTerms: ["alenearbeid", "hjemmebesok", "risiko"],
        titlePlaceholder: "F.eks: Utrygg situasjon ved hjemmebesøk",
        detailsLabel: "Hva gjorde situasjonen risikofylt?",
        detailsPlaceholder: "F.eks. manglende kontaktpunkt, trussel, utrygg adkomst, ingen kollegastøtte",
      },
      infectionExposure: {
        type: "ULYKKE",
        subcategoryMatchTerms: ["smitte", "eksponering", "stikk", "kutt"],
        titlePlaceholder: "F.eks: Smitteeksponering i oppdrag",
        detailsLabel: "Beskriv eksponeringen",
        detailsPlaceholder: "Hva ble du eksponert for, hvordan skjedde det, og hvilke tiltak ble gjort?",
      },
      medicationNearMiss: {
        type: "NESTEN",
        subcategoryMatchTerms: ["medikament", "nesten", "feil"],
        titlePlaceholder: "F.eks: Nesten-feil i medikamenthåndtering",
        detailsLabel: "Hva stoppet feilen før den nådde pasient?",
        detailsPlaceholder: "Beskriv kontrollpunktet og hvorfor feilen kunne oppstå",
      },
      violenceThreat: {
        type: "ULYKKE",
        subcategoryMatchTerms: ["vold", "trussel"],
        titlePlaceholder: "F.eks: Trussel fra bruker/pårørende",
        detailsLabel: "Beskriv hendelsesforløpet",
        detailsPlaceholder: "Hvem var til stede, hvordan ble situasjonen avverget, og om alarm/varsling ble brukt",
      },
    }),
    []
  );

  useEffect(() => {
    setSelectedType(contextPresets[incidentContext].type);
  }, [incidentContext, contextPresets]);

  useEffect(() => {
    async function fetchSubcategories() {
      if (!selectedType) {
        setSubcategoryOptions([]);
        setSelectedSubcategoryKeys([]);
        return;
      }
      setLoadingSubcategories(true);
      try {
        const response = await fetch(`/api/incidents/subcategories?type=${selectedType}`);
        if (!response.ok) {
          setSubcategoryOptions([]);
          setSelectedSubcategoryKeys([]);
          return;
        }
        const data = (await response.json()) as { options?: SubcategoryOption[] };
        const options = data.options ?? [];
        setSubcategoryOptions(options);
      } catch {
        setSubcategoryOptions([]);
        setSelectedSubcategoryKeys([]);
      } finally {
        setLoadingSubcategories(false);
      }
    }
    fetchSubcategories();
  }, [selectedType]);

  useEffect(() => {
    if (subcategoryOptions.length === 0) {
      setSelectedSubcategoryKeys([]);
      return;
    }
    setSelectedSubcategoryKeys((previous) =>
      previous.filter((key) => subcategoryOptions.some((option) => option.key === key))
    );
    const terms = contextPresets[incidentContext].subcategoryMatchTerms;
    if (terms.length === 0) {
      return;
    }
    const matchingKeys = subcategoryOptions
      .filter((option) => {
      const haystack = `${option.key} ${option.label}`.toLowerCase();
      return terms.some((term) => haystack.includes(term.toLowerCase()));
      })
      .map((option) => option.key);
    if (matchingKeys.length > 0) {
      setSelectedSubcategoryKeys((previous) => {
        if (previous.length > 0) {
          return previous;
        }
        return matchingKeys.slice(0, 2);
      });
    }
  }, [incidentContext, subcategoryOptions, contextPresets]);

  function toggleSubcategory(key: string) {
    setSelectedSubcategoryKeys((previous) =>
      previous.includes(key)
        ? previous.filter((existingKey) => existingKey !== key)
        : [...previous, key]
    );
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImageFiles = [...imageFiles, ...files].slice(0, 5); // Max 5 bilder
      setImageFiles(newImageFiles);

      // Generer previews
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
    
    // Legg til bilder i FormData
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    // Legg til metadata
    formData.set("type", selectedType);
    formData.set("incidentContext", incidentContext);
    formData.set(
      "subcategoryKeys",
      JSON.stringify(selectedSubcategoryKeys)
    );
    formData.append("tenantId", tenantId);
    formData.append("reportedBy", reportedBy);
    formData.append("date", new Date().toISOString());
    if (selectedProjectId !== NO_PROJECT) {
      formData.append("projectId", selectedProjectId);
    }

    try {
      const response = await fetch("/api/incidents/report", {
        method: "POST",
        body: formData, // Send FormData, ikke JSON
      });

      if (!response.ok) {
        throw new Error("Kunne ikke sende rapport");
      }

      toast({
        title: "✅ Avvik rapportert",
        description: "Takk for rapporten! HMS-ansvarlig er varslet.",
      });

      router.push(successRedirectPath);
    } catch (error) {
      toast({
        title: "❌ Feil",
        description: "Kunne ikke sende rapport. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prosjektvelger (kun om det finnes aktive prosjekter) */}
      {projects.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base">Prosjekt / jobb</Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Velg prosjekt (valgfritt)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>— Ikke prosjektrelatert —</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}{p.code ? ` (${p.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Er avviket knyttet til et bestemt prosjekt eller oppdrag?
          </p>
        </div>
      )}

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="incidentContext" className="text-base">
          Hendelseskontekst *
        </Label>
        <Select value={incidentContext} onValueChange={(value) => setIncidentContext(value as IncidentContext)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Velg kontekst" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">Generell hendelse</SelectItem>
            {isHealthcareTenant && (
              <>
                <SelectItem value="homeVisitRisk">Hjemmebesøk - risikosituasjon</SelectItem>
                <SelectItem value="infectionExposure">Smitteeksponering</SelectItem>
                <SelectItem value="medicationNearMiss">Nesten-feil medikament</SelectItem>
                <SelectItem value="violenceThreat">Vold eller trusler</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type" className="text-base">
          Type hendelse *
        </Label>
        <Select name="type" required value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Velg type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AVVIK">⚠️ Avvik</SelectItem>
            <SelectItem value="NESTEN">🟡 Nestenulykke</SelectItem>
            <SelectItem value="ULYKKE">🔴 Ulykke</SelectItem>
            <SelectItem value="FARLIG_SITUASJON">🟠 Farlig situasjon</SelectItem>
            <SelectItem value="YRKESSYKDOM">🩺 Yrkessykdom</SelectItem>
            <SelectItem value="MILJO">🌍 Miljøavvik</SelectItem>
            <SelectItem value="KVALITET">📋 Kvalitetsavvik</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedType && (
        <div className="space-y-3">
          <Label className="text-base">
            Hva hendelsen dreier seg om
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (velg én eller flere)
            </span>
          </Label>
          {loadingSubcategories ? (
            <p className="text-xs text-muted-foreground">Laster underkategorier...</p>
          ) : subcategoryOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Ingen underkategorier konfigurert for valgt type.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              {subcategoryOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-2 select-none"
                >
                  <Checkbox
                    checked={selectedSubcategoryKeys.includes(option.key)}
                    onCheckedChange={() => toggleSubcategory(option.key)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alvorlighetsgrad */}
      <div className="space-y-2">
        <Label htmlFor="severity" className="text-base">
          Hvor alvorlig? *
        </Label>
        <Select name="severity" required>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Velg alvorlighetsgrad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">🔴 Kritisk (5) - Umiddelbar fare</SelectItem>
            <SelectItem value="4">🟠 Høy (4) - Alvorlig</SelectItem>
            <SelectItem value="3">🟡 Middels (3)</SelectItem>
            <SelectItem value="2">🟢 Lav (2)</SelectItem>
            <SelectItem value="1">⚪ Svært lav (1)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tittel */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base">
          Kort beskrivelse *
        </Label>
        <Input
          id="title"
          name="title"
          placeholder={contextPresets[incidentContext].titlePlaceholder}
          required
          className="h-12 text-base"
        />
      </div>

      {/* Sted */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-base">
          Hvor skjedde det? *
        </Label>
        <Input
          id="location"
          name="location"
          placeholder="F.eks: Verksted, bygg A"
          required
          className="h-12 text-base"
        />
      </div>

      {/* Beskrivelse */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base">
          Detaljert beskrivelse *
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Beskriv hva som skjedde, hvem var involvert, hva var årsaken..."
          required
          rows={6}
          className="text-base resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Jo mer detaljer, jo bedre kan vi forebygge lignende hendelser
        </p>
      </div>

      {contextPresets[incidentContext].detailsLabel && (
        <div className="space-y-2">
          <Label htmlFor="contextDetails" className="text-base">
            {contextPresets[incidentContext].detailsLabel}
          </Label>
          <Textarea
            id="contextDetails"
            name="contextDetails"
            value={contextDetails}
            onChange={(e) => setContextDetails(e.target.value)}
            placeholder={contextPresets[incidentContext].detailsPlaceholder}
            rows={3}
            className="text-base resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Notat lagres som kontekst i avviket (ikke pasientjournal).
          </p>
        </div>
      )}

      {/* Bildeopplasting */}
      <div className="space-y-3">
        <Label htmlFor="images" className="text-base">
          📸 Bilder (valgfritt, maks 5)
        </Label>
        <div className="space-y-3">
          {/* Upload knapp */}
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

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={preview}
                    alt={`Forhåndsvisning ${index + 1}`}
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
        <p className="text-xs text-muted-foreground">
          💡 Bilder hjelper oss å forstå situasjonen bedre og kan brukes til å forebygge lignende hendelser
        </p>
      </div>

      {/* Submit */}
      <div className="flex flex-col gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="w-full h-14 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sender...
            </>
          ) : (
            "📤 Send rapport"
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

