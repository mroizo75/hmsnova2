"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

function getCurrentLocalDateTimeValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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

const employeeIncidentTypeOptions: Array<{
  value: string;
  labelKey: string;
  group: "hms" | "avvik" | "annet";
}> = [
  { value: "ULYKKE", labelKey: "incidentTypes.ULYKKE", group: "hms" },
  { value: "NESTEN", labelKey: "incidentTypes.NESTEN", group: "hms" },
  { value: "FARLIG_SITUASJON", labelKey: "incidentTypes.FARLIG_SITUASJON", group: "hms" },
  { value: "YRKESSYKDOM", labelKey: "incidentTypes.YRKESSYKDOM", group: "hms" },
  { value: "AVVIK", labelKey: "incidentTypes.AVVIK", group: "avvik" },
  { value: "MILJO", labelKey: "incidentTypes.MILJO", group: "avvik" },
  { value: "KVALITET", labelKey: "incidentTypes.KVALITET", group: "avvik" },
  { value: "CUSTOMER", labelKey: "incidentTypes.CUSTOMER", group: "annet" },
];

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
  const t = useTranslations("employeeIncidentForm");
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(NO_PROJECT);
  const [occurredAt, setOccurredAt] = useState<string>(getCurrentLocalDateTimeValue());
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
        titlePlaceholder: t("contextPresets.general.titlePlaceholder"),
      },
      homeVisitRisk: {
        type: "FARLIG_SITUASJON",
        subcategoryMatchTerms: ["alenearbeid", "hjemmebesok", "risiko"],
        titlePlaceholder: t("contextPresets.homeVisitRisk.titlePlaceholder"),
        detailsLabel: t("contextPresets.homeVisitRisk.detailsLabel"),
        detailsPlaceholder: t("contextPresets.homeVisitRisk.detailsPlaceholder"),
      },
      infectionExposure: {
        type: "ULYKKE",
        subcategoryMatchTerms: ["smitte", "eksponering", "stikk", "kutt"],
        titlePlaceholder: t("contextPresets.infectionExposure.titlePlaceholder"),
        detailsLabel: t("contextPresets.infectionExposure.detailsLabel"),
        detailsPlaceholder: t("contextPresets.infectionExposure.detailsPlaceholder"),
      },
      medicationNearMiss: {
        type: "NESTEN",
        subcategoryMatchTerms: ["medikament", "nesten", "feil"],
        titlePlaceholder: t("contextPresets.medicationNearMiss.titlePlaceholder"),
        detailsLabel: t("contextPresets.medicationNearMiss.detailsLabel"),
        detailsPlaceholder: t("contextPresets.medicationNearMiss.detailsPlaceholder"),
      },
      violenceThreat: {
        type: "ULYKKE",
        subcategoryMatchTerms: ["vold", "trussel"],
        titlePlaceholder: t("contextPresets.violenceThreat.titlePlaceholder"),
        detailsLabel: t("contextPresets.violenceThreat.detailsLabel"),
        detailsPlaceholder: t("contextPresets.violenceThreat.detailsPlaceholder"),
      },
    }),
    [t]
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
    formData.set("occurredAt", occurredAt);
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
        throw new Error(t("errors.submitFailed"));
      }

      toast({
        title: t("toast.success.title"),
        description: t("toast.success.description"),
      });

      router.push(successRedirectPath);
    } catch (error) {
      toast({
        title: t("toast.error.title"),
        description: t("toast.error.description"),
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
          <Label className="text-base">{t("fields.project.label")}</Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder={t("fields.project.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>{t("fields.project.none")}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}{p.code ? ` (${p.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("fields.project.help")}
          </p>
        </div>
      )}

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="incidentContext" className="text-base">
          {t("fields.incidentContext.label")}
        </Label>
        <Select value={incidentContext} onValueChange={(value) => setIncidentContext(value as IncidentContext)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={t("fields.incidentContext.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">{t("fields.incidentContext.options.general")}</SelectItem>
            {isHealthcareTenant && (
              <>
                <SelectItem value="homeVisitRisk">{t("fields.incidentContext.options.homeVisitRisk")}</SelectItem>
                <SelectItem value="infectionExposure">{t("fields.incidentContext.options.infectionExposure")}</SelectItem>
                <SelectItem value="medicationNearMiss">{t("fields.incidentContext.options.medicationNearMiss")}</SelectItem>
                <SelectItem value="violenceThreat">{t("fields.incidentContext.options.violenceThreat")}</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type" className="text-base">
          {t("fields.type.label")}
        </Label>
        <Select name="type" required value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={t("fields.type.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("fields.type.groups.hms")}
            </div>
            {employeeIncidentTypeOptions
              .filter((option) => option.group === "hms")
              .map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            <div className="mt-1 border-t px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("fields.type.groups.avvik")}
            </div>
            {employeeIncidentTypeOptions
              .filter((option) => option.group === "avvik")
              .map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            <div className="mt-1 border-t px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("fields.type.groups.other")}
            </div>
            {employeeIncidentTypeOptions
              .filter((option) => option.group === "annet")
              .map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {selectedType && (
        <div className="space-y-3">
          <Label className="text-base">
            {t("fields.subcategories.label")}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {t("fields.subcategories.hint")}
            </span>
          </Label>
          {loadingSubcategories ? (
            <p className="text-xs text-muted-foreground">{t("fields.subcategories.loading")}</p>
          ) : subcategoryOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("fields.subcategories.empty")}
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
          {t("fields.severity.label")}
        </Label>
        <Select name="severity" required>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={t("fields.severity.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">{t("fields.severity.options.s5")}</SelectItem>
            <SelectItem value="4">{t("fields.severity.options.s4")}</SelectItem>
            <SelectItem value="3">{t("fields.severity.options.s3")}</SelectItem>
            <SelectItem value="2">{t("fields.severity.options.s2")}</SelectItem>
            <SelectItem value="1">{t("fields.severity.options.s1")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="occurredAt" className="text-base">
          {t("fields.occurredAt.label")}
        </Label>
        <Input
          id="occurredAt"
          name="occurredAt"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          required
          max={getCurrentLocalDateTimeValue()}
          className="h-12 text-base"
        />
      </div>

      {/* Tittel */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base">
          {t("fields.title.label")}
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
          {t("fields.location.label")}
        </Label>
        <Input
          id="location"
          name="location"
          placeholder={t("fields.location.placeholder")}
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="witnessName" className="text-base">
          {t("fields.witnessName.label")}
        </Label>
        <Input
          id="witnessName"
          name="witnessName"
          placeholder={t("fields.witnessName.placeholder")}
          className="h-12 text-base"
        />
      </div>

      {/* Beskrivelse */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base">
          {t("fields.description.label")}
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder={t("fields.description.placeholder")}
          required
          rows={6}
          className="text-base resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {t("fields.description.help")}
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
            {t("fields.contextDetails.help")}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="involvedPersons" className="text-base">
          {t("fields.involvedPersons.label")}
        </Label>
        <Textarea
          id="involvedPersons"
          name="involvedPersons"
          placeholder={t("fields.involvedPersons.placeholder")}
          rows={2}
          className="text-base resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="injuryType" className="text-base">
          {t("fields.injuryType.label")}
        </Label>
        <Input
          id="injuryType"
          name="injuryType"
          placeholder={t("fields.injuryType.placeholder")}
          className="h-12 text-base"
        />
      </div>

      {selectedType === "CUSTOMER" && (
        <div className="space-y-4 rounded-lg border p-4">
          <Label className="text-base font-semibold">{t("fields.customer.title")}</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-base">
                {t("fields.customer.customerName.label")}
              </Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder={t("fields.customer.customerName.placeholder")}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-base">
                {t("fields.customer.customerEmail.label")}
              </Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                placeholder={t("fields.customer.customerEmail.placeholder")}
                className="h-12 text-base"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="text-base">
                {t("fields.customer.customerPhone.label")}
              </Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                placeholder={t("fields.customer.customerPhone.placeholder")}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerTicketId" className="text-base">
                {t("fields.customer.customerTicketId.label")}
              </Label>
              <Input
                id="customerTicketId"
                name="customerTicketId"
                placeholder={t("fields.customer.customerTicketId.placeholder")}
                className="h-12 text-base"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responseDeadline" className="text-base">
                {t("fields.customer.responseDeadline.label")}
              </Label>
              <Input
                id="responseDeadline"
                name="responseDeadline"
                type="date"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerSatisfaction" className="text-base">
                {t("fields.customer.customerSatisfaction.label")}
              </Label>
              <Select name="customerSatisfaction">
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder={t("fields.customer.customerSatisfaction.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Bildeopplasting */}
      <div className="space-y-3">
        <Label htmlFor="images" className="text-base">
          {t("fields.images.label")}
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
                  {imageFiles.length >= 5 ? t("fields.images.maxReached") : t("fields.images.takeOrChoose")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {imageFiles.length > 0
                    ? t("fields.images.count", { count: imageFiles.length })
                    : t("fields.images.optional")}
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
                    alt={t("fields.images.previewAlt", { index: index + 1 })}
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
          {t("fields.images.help")}
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
              {t("actions.sending")}
            </>
          ) : (
            t("actions.submit")
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
          {t("actions.cancel")}
        </Button>
      </div>
    </form>
  );
}

