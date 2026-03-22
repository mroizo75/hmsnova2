"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { getRiskColor } from "@/features/sja/schemas/sja.schema";
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
  const t = useTranslations("employeeSjaForm");
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
        title: t("toast.participantsMissing.title"),
        description: t("toast.participantsMissing.description"),
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
        title: t("toast.noHazards.title"),
        description: t("toast.noHazards.description"),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const plannedDateStr = formData.get("plannedDate") as string;
    if (!plannedDateStr) {
      toast({
        title: t("toast.dateMissing.title"),
        description: t("toast.dateMissing.description"),
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
        title: t("toast.submitSuccess.title"),
        description: t("toast.submitSuccess.description"),
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
        title: t("toast.error.title"),
        description: error.message || t("toast.error.description"),
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
        title: t("toast.aiMissingData.title"),
        description: t("toast.aiMissingData.description"),
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
          title: t("toast.aiFailed.title"),
          description: result.error || t("toast.aiFailed.description"),
        });
        return;
      }
      setAiSummary(result.data.summary);
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const getRiskLabel = (riskLevel: number): string => {
    if (riskLevel >= 15) return t("risk.veryHigh");
    if (riskLevel >= 10) return t("risk.high");
    if (riskLevel >= 5) return t("risk.medium");
    return t("risk.low");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* === SEKSJON 1: Generell informasjon === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">{t("sections.general")}</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base">
              {t("fields.title.label")} *
            </Label>
            <Input
              id="title"
              name="title"
              placeholder={t("fields.title.placeholder")}
              required
              defaultValue={initialData?.title}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedDate" className="text-base">
              {t("fields.plannedDate.label")} *
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
                {t("fields.project.label")}
              </Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="projectId" className="h-12 text-base">
                  <SelectValue placeholder={t("fields.project.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("fields.project.none")}</SelectItem>
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
              {t("fields.workLocation.label")} *
            </Label>
            <Input
              id="workLocation"
              name="workLocation"
              placeholder={t("fields.workLocation.placeholder")}
              required
              defaultValue={initialData?.workLocation}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weatherConditions" className="text-base flex items-center gap-1">
              <CloudSun className="h-4 w-4" />
              {t("fields.weatherConditions.label")}
            </Label>
            <Input
              id="weatherConditions"
              name="weatherConditions"
              placeholder={t("fields.weatherConditions.placeholder")}
              className="h-12 text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base">
            {t("fields.description.label")}
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder={t("fields.description.placeholder")}
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
          {t("sections.participants")}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="participants" className="text-base">
            {t("fields.participants.label")} *
          </Label>
          <Textarea
            id="participants"
            name="participants"
            placeholder={t("fields.participants.placeholder")}
            defaultValue={initialData?.participants}
            rows={3}
            required
            className="text-base resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {t("fields.participants.help")}
          </p>
        </div>
      </div>

      {/* === SEKSJON 3: Spesielle forhold === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          {t("sections.specialConditions")}
        </h3>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-900 mb-3">
              <strong>{t("fields.additionalConditions.title")}</strong> {t("fields.additionalConditions.help")}
            </p>
            <Textarea
              id="additionalConditions"
              name="additionalConditions"
              placeholder={t("fields.additionalConditions.placeholder")}
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
          {t("sections.hazards")}
        </h3>

        {initialData?.templateName && (
          <p className="text-sm text-muted-foreground">
            {t("templatePrefill")}
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
                    {t("hazards.item", { index: index + 1 })}
                  </span>
                  {hazard.probability > 0 && hazard.severity > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskColor(
                        hazard.probability * hazard.severity
                      )}`}
                    >
                      {t("hazards.risk")}: {hazard.probability * hazard.severity} -{" "}
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
                  <Label className="text-sm">{t("hazards.activity")} *</Label>
                  <Input
                    value={hazard.activity}
                    onChange={(e) => updateHazard(index, "activity", e.target.value)}
                    placeholder={t("hazards.activityPlaceholder")}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t("hazards.hazard")} *</Label>
                  <Input
                    value={hazard.hazard}
                    onChange={(e) => updateHazard(index, "hazard", e.target.value)}
                    placeholder={t("hazards.hazardPlaceholder")}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">{t("hazards.consequence")}</Label>
                <Input
                  value={hazard.consequence}
                  onChange={(e) => updateHazard(index, "consequence", e.target.value)}
                  placeholder={t("hazards.consequencePlaceholder")}
                  className="text-sm"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-sm">{t("hazards.probability")}</Label>
                  <Select
                    value={String(hazard.probability)}
                    onValueChange={(v) => updateHazard(index, "probability", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("hazards.probabilityOptions.o1")}</SelectItem>
                      <SelectItem value="2">{t("hazards.probabilityOptions.o2")}</SelectItem>
                      <SelectItem value="3">{t("hazards.probabilityOptions.o3")}</SelectItem>
                      <SelectItem value="4">{t("hazards.probabilityOptions.o4")}</SelectItem>
                      <SelectItem value="5">{t("hazards.probabilityOptions.o5")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t("hazards.severity")}</Label>
                  <Select
                    value={String(hazard.severity)}
                    onValueChange={(v) => updateHazard(index, "severity", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("hazards.severityOptions.o1")}</SelectItem>
                      <SelectItem value="2">{t("hazards.severityOptions.o2")}</SelectItem>
                      <SelectItem value="3">{t("hazards.severityOptions.o3")}</SelectItem>
                      <SelectItem value="4">{t("hazards.severityOptions.o4")}</SelectItem>
                      <SelectItem value="5">{t("hazards.severityOptions.o5")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t("hazards.responsible")}</Label>
                  <Input
                    value={hazard.responsibleName}
                    onChange={(e) => updateHazard(index, "responsibleName", e.target.value)}
                    placeholder={t("hazards.responsiblePlaceholder")}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">{t("hazards.measures")} *</Label>
                <Textarea
                  value={hazard.measures}
                  onChange={(e) => updateHazard(index, "measures", e.target.value)}
                  placeholder={t("hazards.measuresPlaceholder")}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full" onClick={addHazard}>
            <Plus className="h-4 w-4 mr-2" />
            {t("hazards.addMore")}
          </Button>
        </div>
      </div>

      {/* === SEKSJON 5: Bilder === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {t("sections.images")}
        </h3>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("images.help")}
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
                  {imageFiles.length >= 5 ? t("images.maxReached") : t("images.takeOrChoose")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {imageFiles.length > 0 ? t("images.count", { count: imageFiles.length }) : t("images.optional")}
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
                    alt={t("images.previewAlt", { index: index + 1 })}
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
            {t("sections.confirm")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-900">
            {t("confirm.title")}
          </p>
          <ul className="list-disc list-inside text-sm text-green-800 space-y-1 ml-2">
            <li>{t("confirm.points.p1")}</li>
            <li>{t("confirm.points.p2")}</li>
            <li>{t("confirm.points.p3")}</li>
            <li>{t("confirm.points.p4")}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("ai.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
            {isGeneratingSummary ? t("ai.generating") : t("ai.generate")}
          </Button>
          <Textarea
            value={aiSummary}
            onChange={(event) => setAiSummary(event.target.value)}
            placeholder={t("ai.placeholder")}
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
              {t("actions.submitting")}
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
