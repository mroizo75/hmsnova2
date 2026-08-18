"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Loader2, Camera, X } from "lucide-react";
import Image from "next/image";
import type { IncidentType } from "@prisma/client";
import { enqueueSafe, formDataToOfflinePayload, isNetworkError, isAvailable } from "@/lib/offline-queue";
import {
  getIncidentTypeGroups,
  getIncidentTypesForGroup,
  getSingleTypeForGroup,
  type IncidentTypeGroup,
} from "@/features/incidents/schemas/incident.schema";
import { PROJECT_REFERENCE_MAX_LENGTH } from "@/lib/incident-project-reference";

const NO_PROJECT = "__none__";

// Alvorlighetsgrad er valgfri ved registrering – leder setter grad ved behandling
const NOT_ASSESSED_SEVERITY = "__not_assessed__";

function getCurrentLocalDateTimeValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ReportIncidentForm({
  tenantId,
  reportedBy,
  projects = [],
  successRedirectPath = "/ansatt/avvik/takk",
  ruhModuleEnabled = true,
}: {
  tenantId: string;
  reportedBy: string;
  projects?: Array<{ id: string; name: string; code: string | null }>;
  successRedirectPath?: string;
  ruhModuleEnabled?: boolean;
}) {
  const t = useTranslations("employeeIncidentForm");
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(NO_PROJECT);
  const [occurredAt, setOccurredAt] = useState<string>(getCurrentLocalDateTimeValue());
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [typeGroup, setTypeGroup] = useState<IncidentTypeGroup | null>(null);
  const [selectedType, setSelectedType] = useState<IncidentType | "">("");

  const groups = getIncidentTypeGroups(ruhModuleEnabled);
  const typesInGroup = typeGroup
    ? getIncidentTypesForGroup(typeGroup, ruhModuleEnabled)
    : [];
  const needsTypeChoice = typesInGroup.length > 1;

  function handleTypeGroupChange(group: IncidentTypeGroup) {
    setTypeGroup(group);
    // Grupper med bare én type velger typen direkte, slik at steg 2 kan hoppes over
    setSelectedType(getSingleTypeForGroup(group, ruhModuleEnabled) ?? "");
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

    if (!selectedType) {
      toast({
        title: t("toast.error.title"),
        description: t("fields.type.placeholder"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    // Legg til bilder i FormData
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    formData.set("type", selectedType);
    if (formData.get("severity") === NOT_ASSESSED_SEVERITY) {
      formData.delete("severity");
    }
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
        body: formData,
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
      if (isNetworkError(error) && isAvailable()) {
        const { payload, files } = formDataToOfflinePayload(formData);
        const result = await enqueueSafe({
          id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "incident",
          createdAt: new Date().toISOString(),
          endpoint: "/api/incidents/report",
          payload,
          files,
        });
        if (result.stored) {
          toast({
            title: "Lagret lokalt",
            description: "Registreringen sendes automatisk når du er tilbake online.",
            className: "bg-amber-50 border-amber-200",
          });
          router.push(successRedirectPath);
          return;
        }
        toast({
          title: "Offline-køen er full",
          description: result.reason === "quota_size"
            ? "For mange bilder lagret lokalt. Koble til nett og synkroniser først."
            : "Maks antall ventende registreringer nådd. Synkroniser først.",
          variant: "destructive",
        });
        return;
      }
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

      {/* Prosjektnummer som fritekst for oppdrag som ikke er registrert som prosjekt */}
      <div className="space-y-2">
        <Label htmlFor="projectReference" className="text-base">
          {t("fields.projectReference.label")}
        </Label>
        <Input
          id="projectReference"
          name="projectReference"
          placeholder={t("fields.projectReference.placeholder")}
          maxLength={PROJECT_REFERENCE_MAX_LENGTH}
          disabled={isSubmitting}
          className="h-12 text-base"
        />
        <p className="text-xs text-muted-foreground">
          {t("fields.projectReference.help")}
        </p>
      </div>

      {/* Steg 1: Fagområde / hovedkategori */}
      <div className="space-y-2">
        <Label className="text-base">
          {t("fields.mainCategory.label")}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {groups.map((definition) => (
            <button
              key={definition.group}
              type="button"
              onClick={() => handleTypeGroupChange(definition.group)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                typeGroup === definition.group
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
            >
              <span className="text-lg font-semibold">
                {t(`fields.typeGroup.${definition.group}.label`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`fields.typeGroup.${definition.group}.desc`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Steg 2: Type innenfor valgt gruppe. Grupper med bare én type hopper over dette */}
      {typeGroup && needsTypeChoice && (
        <div className="space-y-2">
          <Label htmlFor="type" className="text-base">
            {t("fields.type.label")}
          </Label>
          <Select
            value={selectedType || undefined}
            onValueChange={(value) => setSelectedType(value as IncidentType)}
          >
            <SelectTrigger id="type" className="h-12 text-base">
              <SelectValue placeholder={t("fields.type.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {typesInGroup.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`incidentTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Alvorlighetsgrad – valgfri, leder kan sette grad ved behandling */}
      <div className="space-y-2">
        <Label htmlFor="severity" className="text-base">
          {t("fields.severity.label")}
        </Label>
        <Select name="severity" defaultValue={NOT_ASSESSED_SEVERITY}>
          <SelectTrigger id="severity" className="h-12 text-base">
            <SelectValue placeholder={t("fields.severity.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOT_ASSESSED_SEVERITY}>
              {t("fields.severity.notAssessedOption")}
            </SelectItem>
            <SelectItem value="5">{t("fields.severity.options.s5")}</SelectItem>
            <SelectItem value="4">{t("fields.severity.options.s4")}</SelectItem>
            <SelectItem value="3">{t("fields.severity.options.s3")}</SelectItem>
            <SelectItem value="2">{t("fields.severity.options.s2")}</SelectItem>
            <SelectItem value="1">{t("fields.severity.options.s1")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("fields.severity.help")}
        </p>
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
          placeholder={t("fields.title.placeholder")}
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

      {/* Personinvolvering og skadeomfang er ukjent ved melding. Uten RUH-modulen
          fyller leder dette ut under behandlingen i stedet. */}
      {ruhModuleEnabled && (
        <>
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
        </>
      )}

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

