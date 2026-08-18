"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { enqueueSafe, formDataToOfflinePayload, isNetworkError, isAvailable } from "@/lib/offline-queue";

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
  const t = useTranslations("employeeRuhForm");
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
        titlePlaceholder: t("contextPresets.general.titlePlaceholder"),
      },
      homeVisitRisk: {
        category: "NESTENULYKKE",
        titlePlaceholder: t("contextPresets.homeVisitRisk.titlePlaceholder"),
        detailsLabel: t("contextPresets.homeVisitRisk.detailsLabel"),
        detailsPlaceholder: t("contextPresets.homeVisitRisk.detailsPlaceholder"),
      },
      infectionExposure: {
        category: "PERSONSKADE",
        titlePlaceholder: t("contextPresets.infectionExposure.titlePlaceholder"),
        detailsLabel: t("contextPresets.infectionExposure.detailsLabel"),
        detailsPlaceholder: t("contextPresets.infectionExposure.detailsPlaceholder"),
      },
      medicationNearMiss: {
        category: "NESTENULYKKE",
        titlePlaceholder: t("contextPresets.medicationNearMiss.titlePlaceholder"),
        detailsLabel: t("contextPresets.medicationNearMiss.detailsLabel"),
        detailsPlaceholder: t("contextPresets.medicationNearMiss.detailsPlaceholder"),
      },
      violenceThreat: {
        category: "TRUSLER_VOLD",
        titlePlaceholder: t("contextPresets.violenceThreat.titlePlaceholder"),
        detailsLabel: t("contextPresets.violenceThreat.detailsLabel"),
        detailsPlaceholder: t("contextPresets.violenceThreat.detailsPlaceholder"),
      },
    }),
    [t]
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
          id: `ruh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "ruh",
          createdAt: new Date().toISOString(),
          endpoint: "/api/ruh/report",
          payload,
          files,
        });
        if (result.stored) {
          toast({
            title: "Lagret lokalt",
            description: "RUH-meldingen sendes automatisk når du er tilbake online.",
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
      <div className="space-y-2">
        <Label htmlFor="ruhContext" className="text-base">
          {t("fields.ruhContext.label")}
        </Label>
        <Select value={ruhContext} onValueChange={(value) => setRuhContext(value as RuhContext)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={t("fields.ruhContext.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">{t("fields.ruhContext.options.general")}</SelectItem>
            {isHealthcareTenant && (
              <>
                <SelectItem value="homeVisitRisk">{t("fields.ruhContext.options.homeVisitRisk")}</SelectItem>
                <SelectItem value="infectionExposure">{t("fields.ruhContext.options.infectionExposure")}</SelectItem>
                <SelectItem value="medicationNearMiss">{t("fields.ruhContext.options.medicationNearMiss")}</SelectItem>
                <SelectItem value="violenceThreat">{t("fields.ruhContext.options.violenceThreat")}</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-base">
          {t("fields.category.label")}
        </Label>
        <Select
          name="category"
          required
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as RuhContextPreset["category"])}
        >
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={t("fields.category.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERSONSKADE">{t("fields.category.options.PERSONSKADE")}</SelectItem>
            <SelectItem value="NESTENULYKKE">{t("fields.category.options.NESTENULYKKE")}</SelectItem>
            <SelectItem value="MATERIELL_SKADE">{t("fields.category.options.MATERIELL_SKADE")}</SelectItem>
            <SelectItem value="BRANN_EKSPLOSJON">{t("fields.category.options.BRANN_EKSPLOSJON")}</SelectItem>
            <SelectItem value="UTSLIPP_MILJO">{t("fields.category.options.UTSLIPP_MILJO")}</SelectItem>
            <SelectItem value="TRUSLER_VOLD">{t("fields.category.options.TRUSLER_VOLD")}</SelectItem>
            <SelectItem value="ERGONOMI">{t("fields.category.options.ERGONOMI")}</SelectItem>
            <SelectItem value="ANNET">{t("fields.category.options.ANNET")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-base">
          {t("fields.title.label")}
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

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="injury-switch" className="text-base font-medium">
            {t("fields.injuryOccurred.label")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("fields.injuryOccurred.help")}
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
            {t("fields.injuryDescription.label")}
          </Label>
          <Textarea
            id="injuryDescription"
            name="injuryDescription"
            placeholder={t("fields.injuryDescription.placeholder")}
            rows={3}
            className="text-base resize-none"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="immediateAction" className="text-base">
          {t("fields.immediateAction.label")}
        </Label>
        <Textarea
          id="immediateAction"
          name="immediateAction"
          placeholder={t("fields.immediateAction.placeholder")}
          rows={3}
          className="text-base resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggestedActions" className="text-base">
          {t("fields.suggestedActions.label")}
        </Label>
        <Textarea
          id="suggestedActions"
          name="suggestedActions"
          placeholder={t("fields.suggestedActions.placeholder")}
          rows={3}
          className="text-base resize-none"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="images" className="text-base">
          {t("fields.images.label")}
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
