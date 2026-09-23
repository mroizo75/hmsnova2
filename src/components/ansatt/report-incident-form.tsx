"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ai/voice-textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, X, Sparkles } from "lucide-react";
import Image from "next/image";
import type { IncidentType } from "@prisma/client";
import { enqueueSafe, formDataToOfflinePayload, isNetworkError, isAvailable } from "@/lib/offline-queue";
import {
  getIncidentTypeGroups,
  getIncidentTypesForGroup,
  getSingleTypeForGroup,
  type IncidentTypeGroup,
} from "@/features/incidents/schemas/incident.schema";
import { generateAiIncidentCaseDraft } from "@/server/actions/ai-assistant.actions";
import { PsychosocialIncidentHint } from "@/features/incidents/components/psychosocial-incident-hint";

const NO_REPORTED_FOR = "__none__";
const NO_PROJECT = "__none__";
const NO_EQUIPMENT = "__none__";

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
  users = [],
  projects = [],
  equipment = [],
  successRedirectPath = "/ansatt/avvik/takk",
  ruhModuleEnabled = true,
  aiEnabled = false,
  defaultValues,
}: {
  tenantId: string;
  reportedBy: string;
  users?: Array<{ id: string; name: string | null; email: string }>;
  projects?: Array<{ id: string; name: string; code: string | null }>;
  equipment?: Array<{ id: string; name: string; serialNumber: string | null }>;
  successRedirectPath?: string;
  ruhModuleEnabled?: boolean;
  aiEnabled?: boolean;
  defaultValues?: {
    type?: IncidentType;
    title?: string;
    description?: string;
    location?: string;
    immediateAction?: string;
    projectId?: string;
    equipmentId?: string;
  };
}) {
  const t = useTranslations("employeeIncidentForm");
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occurredAt, setOccurredAt] = useState<string>(getCurrentLocalDateTimeValue());
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [typeGroup, setTypeGroup] = useState<IncidentTypeGroup | null>(
    defaultValues?.type
      ? getIncidentTypeGroups(ruhModuleEnabled).find((g) =>
          getIncidentTypesForGroup(g.group, ruhModuleEnabled).includes(defaultValues.type!)
        )?.group ?? null
      : null
  );
  const [selectedType, setSelectedType] = useState<IncidentType | "">(
    defaultValues?.type ?? ""
  );
  const [reportedForUserId, setReportedForUserId] = useState<string>(NO_REPORTED_FOR);
  const [projectId, setProjectId] = useState<string>(defaultValues?.projectId ?? NO_PROJECT);
  const [equipmentId, setEquipmentId] = useState<string>(defaultValues?.equipmentId ?? NO_EQUIPMENT);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    rootCause: string;
    immediateAction: string;
    suggestedActions: string[];
  } | null>(null);

  const groups = getIncidentTypeGroups(ruhModuleEnabled);
  const typesInGroup = typeGroup
    ? getIncidentTypesForGroup(typeGroup, ruhModuleEnabled)
    : [];
  const needsTypeChoice = typesInGroup.length > 1;

  function handleTypeGroupChange(group: IncidentTypeGroup) {
    setTypeGroup(group);
    setSelectedType(getSingleTypeForGroup(group, ruhModuleEnabled) ?? "");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const merged = [...imageFiles, ...files].slice(0, 5);
      setImageFiles(merged);
      setImagePreviews(merged.map((file) => URL.createObjectURL(file)));
    }
  }

  async function handleAiDraft() {
    const form = document.querySelector("form");
    if (!form) return;
    const fd = new FormData(form);
    const title = (fd.get("title") as string)?.trim();
    const description = (fd.get("description") as string)?.trim();
    if (!selectedType || !title || title.length < 2 || !description || description.length < 10) {
      toast({
        title: "Fyll ut mer",
        description: "AI trenger type, tittel og beskrivelse (minst 10 tegn) for å gi forslag.",
        variant: "destructive",
      });
      return;
    }
    setAiLoading(true);
    try {
      const result = await generateAiIncidentCaseDraft({
        type: selectedType,
        title,
        description,
      });
      if (result.success && result.data) {
        setAiSuggestion({
          rootCause: result.data.rootCause,
          immediateAction: result.data.immediateAction,
          suggestedActions: result.data.suggestedActions,
        });
        const actionEl = document.getElementById("immediateAction") as HTMLTextAreaElement | null;
        if (actionEl && !actionEl.value.trim() && result.data.immediateAction) {
          actionEl.value = result.data.immediateAction;
        }
      } else {
        toast({ title: "AI-feil", description: result.error || "Kunne ikke generere forslag", variant: "destructive" });
      }
    } catch {
      toast({ title: "AI-feil", description: "Noe gikk galt", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  function removeImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
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

    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    formData.set("type", selectedType);
    formData.append("tenantId", tenantId);
    formData.append("reportedBy", reportedBy);
    formData.set("occurredAt", occurredAt);
    formData.append("date", new Date().toISOString());
    if (reportedForUserId !== NO_REPORTED_FOR) {
      formData.append("reportedForUserId", reportedForUserId);
    }
    if (projectId !== NO_PROJECT) {
      formData.set("projectId", projectId);
    }
    if (equipmentId !== NO_EQUIPMENT) {
      formData.set("equipmentApprovalId", equipmentId);
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1. Hva vil du rapportere? — full bredde, kompakte knapper */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          {t("fields.mainCategory.label")}
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {groups.map((definition) => (
            <button
              key={definition.group}
              type="button"
              onClick={() => handleTypeGroupChange(definition.group)}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 text-center transition-colors ${
                typeGroup === definition.group
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
            >
              <span className="text-sm font-semibold sm:text-base">
                {t(`fields.typeGroup.${definition.group}.label`)}
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground hidden sm:block">
                {t(`fields.typeGroup.${definition.group}.desc`)}
              </span>
            </button>
          ))}
        </div>
        <PsychosocialIncidentHint />
      </div>

      {/* Undertype — kun hvis gruppen har flere typer */}
      {typeGroup && needsTypeChoice && (
        <div className="space-y-2">
          <Label htmlFor="type" className="text-base">
            {t("fields.type.label")}
          </Label>
          <Select
            value={selectedType || undefined}
            onValueChange={(value) => setSelectedType(value as IncidentType)}
          >
            <SelectTrigger id="type" className="h-11 text-base">
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

      {/* 2. Tittel — full bredde, viktigste feltet */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base">
          {t("fields.title.label")}
        </Label>
        <Input
          id="title"
          name="title"
          placeholder={t("fields.title.placeholder")}
          defaultValue={defaultValues?.title}
          required
          disabled={isSubmitting}
          className="h-11 text-base"
        />
      </div>

      {/* 3. Sted + Tidspunkt — side ved side på desktop, stacker på mobil */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location" className="text-base">
            {t("fields.location.label")}
          </Label>
          <Input
            id="location"
            name="location"
            placeholder={t("fields.location.placeholder")}
            defaultValue={defaultValues?.location}
            required
            disabled={isSubmitting}
            className="h-11 text-base"
          />
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
            disabled={isSubmitting}
            max={getCurrentLocalDateTimeValue()}
            className="h-11 text-base"
          />
        </div>
      </div>

      {projects.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="projectId" className="text-base">
            {t("fields.project.label")}
          </Label>
          <Select value={projectId} onValueChange={setProjectId} disabled={isSubmitting}>
            <SelectTrigger id="projectId" className="h-11 text-base">
              <SelectValue placeholder={t("fields.project.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>{t("fields.project.none")}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code ? `${p.code} · ${p.name}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("fields.project.help")}</p>
        </div>
      )}

      {equipment.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="equipmentApprovalId" className="text-base">
            {t("fields.equipment.label")}
          </Label>
          <Select value={equipmentId} onValueChange={setEquipmentId} disabled={isSubmitting}>
            <SelectTrigger id="equipmentApprovalId" className="h-11 text-base">
              <SelectValue placeholder={t("fields.equipment.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_EQUIPMENT}>{t("fields.equipment.none")}</SelectItem>
              {equipment.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.serialNumber ? `${item.name} · ${item.serialNumber}` : item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("fields.equipment.help")}</p>
        </div>
      )}

      {/* 4. Beskrivelse — full bredde */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base">
          {t("fields.description.label")}
        </Label>
        <VoiceTextarea
          id="description"
          name="description"
          placeholder={t("fields.description.placeholder")}
          defaultValue={defaultValues?.description}
          required
          disabled={isSubmitting}
          rows={4}
          className="text-base resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {t("fields.description.help")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="submitterComment" className="text-base">
          Kommentar (valgfritt)
        </Label>
        <VoiceTextarea
          id="submitterComment"
          name="submitterComment"
          placeholder="Tilleggsopplysninger til behandler"
          disabled={isSubmitting}
          rows={2}
          className="text-base resize-none"
        />
      </div>

      {/* AI-forslag */}
      {aiEnabled && selectedType && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAiDraft}
            disabled={aiLoading || isSubmitting}
            className="gap-2"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {aiLoading ? "Analyserer..." : "Få AI-forslag"}
          </Button>
          {aiSuggestion && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2 text-sm">
              {aiSuggestion.rootCause && (
                <div>
                  <span className="font-medium">Sannsynlig årsak:</span>{" "}
                  <span className="text-muted-foreground">{aiSuggestion.rootCause}</span>
                </div>
              )}
              {aiSuggestion.suggestedActions.length > 0 && (
                <div>
                  <span className="font-medium">Foreslåtte tiltak:</span>
                  <ul className="list-disc ml-4 mt-1 text-muted-foreground">
                    {aiSuggestion.suggestedActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground italic">
                AI-forslag er veiledende og må verifiseres.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Bilde */}
      <div className="space-y-2">
        <Label htmlFor="images" className="text-base">
          {t("fields.images.label")}
        </Label>
        <div className="relative">
          <Input
            id="images"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleImageChange}
            disabled={isSubmitting || imageFiles.length >= 5}
            className="sr-only"
          />
          <Label
            htmlFor="images"
            className={`
              flex items-center justify-center gap-2 h-[4.5rem] border-2 border-dashed rounded-lg cursor-pointer
              transition-colors hover:bg-muted/50
              ${imageFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <Camera className="h-5 w-5 text-muted-foreground" />
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

        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
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
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Umiddelbare tiltak */}
      <div className="space-y-2">
        <Label htmlFor="immediateAction" className="text-base">
          {t("fields.immediateAction.label")}
        </Label>
        <VoiceTextarea
          id="immediateAction"
          name="immediateAction"
          placeholder={t("fields.immediateAction.placeholder")}
          defaultValue={defaultValues?.immediateAction}
          disabled={isSubmitting}
          rows={2}
          className="text-base resize-none"
        />
      </div>

      {/* 6. På vegne av (kun for ledere) + kundeklage-felt */}
      {(users.length > 0 || selectedType === "CUSTOMER") && (
        <div className="grid gap-4 sm:grid-cols-2">
          {users.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base">
                {t("fields.reportedForUser.label")}
              </Label>
              <Select
                value={reportedForUserId}
                onValueChange={setReportedForUserId}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder={t("fields.reportedForUser.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REPORTED_FOR}>{t("fields.reportedForUser.none")}</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedType === "CUSTOMER" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-base">
                  {t("fields.customer.customerName.label")}
                </Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder={t("fields.customer.customerName.placeholder")}
                  disabled={isSubmitting}
                  className="h-11 text-base"
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
                  disabled={isSubmitting}
                  className="h-11 text-base"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Send inn */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          size="lg"
          className="h-12 sm:order-1 sm:w-auto"
        >
          {t("actions.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="h-12 text-base font-semibold sm:order-2 sm:w-auto sm:min-w-[200px]"
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
      </div>
    </form>
  );
}
