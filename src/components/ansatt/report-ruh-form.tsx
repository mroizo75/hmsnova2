"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

type RuhContext = "general" | "homeVisitRisk" | "infectionExposure" | "medicationNearMiss" | "violenceThreat";

interface RuhContextPreset {
  category:
    | "PERSONSKADE"
    | "NESTENULYKKE"
    | "MATERIELL_SKADE"
    | "BRANN_EKSPLOSJON"
    | "UTSLIPP_MILJO"
    | "TRUSLER_VOLD"
    | "ERGONOMI"
    | "ANNET";
  titlePlaceholder: string;
  detailsLabel?: string;
  detailsPlaceholder?: string;
}

export function ReportRuhForm({
  tenantId,
  reportedBy,
  successRedirectPath = "/ansatt/ruh/takk",
  isHealthcareTenant = false,
}: {
  tenantId: string;
  reportedBy: string;
  successRedirectPath?: string;
  isHealthcareTenant?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [injuryOccurred, setInjuryOccurred] = useState(false);
  const [ruhContext, setRuhContext] = useState<RuhContext>("general");
  const [selectedCategory, setSelectedCategory] = useState<RuhContextPreset["category"]>("ANNET");
  const [contextDetails, setContextDetails] = useState("");

  const contextPresets = useMemo<Record<RuhContext, RuhContextPreset>>(
    () => ({
      general: {
        category: "ANNET",
        titlePlaceholder: "F.eks: Fall fra stige på lager",
      },
      homeVisitRisk: {
        category: "NESTENULYKKE",
        titlePlaceholder: "F.eks: Utrygg situasjon ved hjemmebesøk",
        detailsLabel: "Hva gjorde situasjonen risikofylt?",
        detailsPlaceholder: "F.eks. alenearbeid uten støtte, utrygg adkomst, trusselsignal",
      },
      infectionExposure: {
        category: "PERSONSKADE",
        titlePlaceholder: "F.eks: Mulig smitteeksponering i oppdrag",
        detailsLabel: "Beskriv eksponeringen",
        detailsPlaceholder: "Hva ble du eksponert for, hvordan, og hvilke strakstiltak ble gjort?",
      },
      medicationNearMiss: {
        category: "NESTENULYKKE",
        titlePlaceholder: "F.eks: Nesten-feil i medikamenthåndtering",
        detailsLabel: "Hva stoppet feilen?",
        detailsPlaceholder: "Beskriv kontrollpunktet og hva som sviktet i prosessen",
      },
      violenceThreat: {
        category: "TRUSLER_VOLD",
        titlePlaceholder: "F.eks: Trussel fra bruker/pårørende",
        detailsLabel: "Beskriv hendelsesforløpet",
        detailsPlaceholder: "Hvem var til stede, hvordan ble situasjonen håndtert, og om alarm ble brukt",
      },
    }),
    []
  );

  useEffect(() => {
    setSelectedCategory(contextPresets[ruhContext].category);
  }, [ruhContext, contextPresets]);

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

    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    formData.append("tenantId", tenantId);
    formData.append("reportedBy", reportedBy);
    formData.append("date", new Date().toISOString());
    formData.append("injuryOccurred", String(injuryOccurred));
    formData.set("category", selectedCategory);
    formData.set("ruhContext", ruhContext);

    try {
      const response = await fetch("/api/ruh/report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Kunne ikke sende rapport");
      }

      toast({
        title: "RUH-rapport sendt",
        description: "Takk for rapporten! HMS-ansvarlig er varslet.",
      });

      router.push(successRedirectPath);
    } catch {
      toast({
        title: "Feil",
        description: "Kunne ikke sende rapport. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ruhContext" className="text-base">
          Hendelseskontekst *
        </Label>
        <Select value={ruhContext} onValueChange={(value) => setRuhContext(value as RuhContext)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Velg kontekst" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">Generell RUH</SelectItem>
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
        <Label htmlFor="category" className="text-base">
          Kategori *
        </Label>
        <Select
          name="category"
          required
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as RuhContextPreset["category"])}
        >
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Velg kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERSONSKADE">Personskade</SelectItem>
            <SelectItem value="NESTENULYKKE">Nestenulykke</SelectItem>
            <SelectItem value="MATERIELL_SKADE">Materiell skade</SelectItem>
            <SelectItem value="BRANN_EKSPLOSJON">Brann / Eksplosjon</SelectItem>
            <SelectItem value="UTSLIPP_MILJO">Utslipp / Miljø</SelectItem>
            <SelectItem value="TRUSLER_VOLD">Trusler / Vold</SelectItem>
            <SelectItem value="ERGONOMI">Ergonomi</SelectItem>
            <SelectItem value="ANNET">Annet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-base">
          Kort beskrivelse av hendelsen *
        </Label>
        <Input
          id="title"
          name="title"
          placeholder={contextPresets[ruhContext].titlePlaceholder}
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location" className="text-base">
          Hvor skjedde hendelsen? *
        </Label>
        <Input
          id="location"
          name="location"
          placeholder="F.eks: Verksted, bygg A, 2. etasje"
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-base">
          Detaljert beskrivelse *
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Beskriv hendelsen i detalj: hva skjedde, hvordan, under hvilke omstendigheter..."
          required
          rows={6}
          className="text-base resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Jo mer detaljer, jo bedre kan vi forebygge lignende hendelser
        </p>
      </div>

      {contextPresets[ruhContext].detailsLabel && (
        <div className="space-y-2">
          <Label htmlFor="contextDetails" className="text-base">
            {contextPresets[ruhContext].detailsLabel}
          </Label>
          <Textarea
            id="contextDetails"
            name="contextDetails"
            value={contextDetails}
            onChange={(e) => setContextDetails(e.target.value)}
            placeholder={contextPresets[ruhContext].detailsPlaceholder}
            rows={3}
            className="text-base resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Notat lagres som RUH-kontekst (ikke pasientjournal).
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="involvedPersons" className="text-base">
          Hvem var involvert?
        </Label>
        <Textarea
          id="involvedPersons"
          name="involvedPersons"
          placeholder="Navn og rolle på involverte personer"
          rows={2}
          className="text-base resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="witnessName" className="text-base">
          Vitner
        </Label>
        <Input
          id="witnessName"
          name="witnessName"
          placeholder="Navn på eventuelle vitner"
          className="h-12 text-base"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="injury-switch" className="text-base font-medium">
            Ble noen skadet?
          </Label>
          <p className="text-xs text-muted-foreground">
            Oppgi om hendelsen medførte personskade
          </p>
        </div>
        <Switch
          id="injury-switch"
          checked={injuryOccurred}
          onCheckedChange={setInjuryOccurred}
        />
      </div>

      {injuryOccurred && (
        <div className="space-y-2">
          <Label htmlFor="injuryDescription" className="text-base">
            Beskriv skaden
          </Label>
          <Textarea
            id="injuryDescription"
            name="injuryDescription"
            placeholder="Type skade, kroppsdel, behandling gitt..."
            rows={3}
            className="text-base resize-none"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="immediateAction" className="text-base">
          Umiddelbare tiltak som ble iverksatt
        </Label>
        <Textarea
          id="immediateAction"
          name="immediateAction"
          placeholder="Hva ble gjort på stedet for å håndtere situasjonen?"
          rows={3}
          className="text-base resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggestedActions" className="text-base">
          Foreslåtte tiltak for å forebygge
        </Label>
        <Textarea
          id="suggestedActions"
          name="suggestedActions"
          placeholder="Hva kan gjøres for å unngå at dette skjer igjen?"
          rows={3}
          className="text-base resize-none"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="images" className="text-base">
          Bilder (valgfritt, maks 5)
        </Label>
        <div className="space-y-3">
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
      </div>

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
            "Send RUH-rapport"
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
