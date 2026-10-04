"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ai/voice-textarea";
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
  Save,
  Zap,
  LocateFixed,
  RefreshCw,
  CheckCircle2,
  Mic,
} from "lucide-react";
import { getRiskColor } from "@/features/sja/schemas/sja.schema";
import {
  fseChecklistItems,
  getRequiredChecklistKeys,
  getRequiredCourseKeys,
  requiresSecondPersonByFse,
  type ElectricalWorkType,
  type FseChecklist,
} from "@/features/sja/lib/sja-fse";
import Image from "next/image";
import {
  formatSjaWeatherConditions,
  isSjaWeatherData,
} from "@/features/sja/lib/sja-weather";
import type { SjaAiDraft } from "@/features/sja/lib/sja-ai";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";

interface HazardRow {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
  responsibleName: string;
  linkedRiskId?: string | null;
}

type DevicePermissionStatus =
  | "unknown"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

const emptyHazard: HazardRow = {
  activity: "",
  hazard: "",
  consequence: "",
  probability: 1,
  severity: 1,
  measures: "",
  responsibleName: "",
  linkedRiskId: null,
};

function parseExternalParticipantNames(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => {
      if (!name) return false;
      const key = name.toLocaleLowerCase("nb-NO");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

interface RiskOption {
  id: string;
  title: string;
  score: number | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  validCourseKeys: string[];
  expiredCourseKeys: string[];
}

interface SjaFormProps {
  tenantId: string;
  currentUserId: string;
  userName: string;
  projectId?: string;
  projects?: Array<{
    id: string;
    name: string;
    location?: string | null;
  }>;
  risks?: RiskOption[];
  employees?: EmployeeOption[];
  onSuccess?: () => void;
  successRedirectPath?: string;
  initialData?: {
    title: string;
    description: string;
    workLocation: string;
    participants: string;
    additionalConditions?: string;
    hazards: HazardRow[];
    templateId?: string;
    templateName?: string;
    electricalWorkType?: ElectricalWorkType;
    workMethod?: string;
    requiredEquipment?: string;
    requiredPpe?: string;
    personnelRequirements?: string;
    safetyConditions?: string;
    weatherConditions?: string;
    requiresSecondPerson?: boolean;
    requiredCourseKeys?: string[];
  };
}

export function SjaForm({
  tenantId,
  currentUserId,
  userName,
  projectId,
  projects = [],
  risks = [],
  employees = [],
  onSuccess,
  successRedirectPath = "/ansatt/sja",
  initialData,
}: SjaFormProps) {
  const t = useTranslations("employeeSjaForm");
  const router = useRouter();
  const { toast } = useToast();
  const { aiEnabled } = useTenantNavContext();
  const initialProjectLocation =
    projects.find((project) => project.id === projectId)?.location ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [workBriefing, setWorkBriefing] = useState("");
  const [microphonePermission, setMicrophonePermission] =
    useState<DevicePermissionStatus>("unknown");
  const [positionPermission, setPositionPermission] =
    useState<DevicePermissionStatus>("unknown");
  const [aiDraftUsed, setAiDraftUsed] = useState(false);
  const [aiDraftWarnings, setAiDraftWarnings] = useState<string[]>([]);
  const [aiVerification, setAiVerification] = useState({
    actualWorksiteConfirmed: false,
    workerParticipationConfirmed: false,
    barriersConfirmed: false,
    stopCriteriaConfirmed: false,
    specialRequirementsConfirmed: false,
  });
  const [formValues, setFormValues] = useState({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    additionalConditions: initialData?.additionalConditions ?? "",
    workMethod: initialData?.workMethod ?? "",
    requiredEquipment: initialData?.requiredEquipment ?? "",
    requiredPpe: initialData?.requiredPpe ?? "",
    personnelRequirements: initialData?.personnelRequirements ?? "",
    safetyConditions: initialData?.safetyConditions ?? "",
  });
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "__none__");
  const [workLocation, setWorkLocation] = useState(
    initialData?.workLocation || initialProjectLocation,
  );
  const [weatherConditions, setWeatherConditions] = useState(
    initialData?.weatherConditions ?? "",
  );
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherStatus, setWeatherStatus] = useState("");
  const lastWeatherQueryRef = useRef("");
  const [hazards, setHazards] = useState<HazardRow[]>(
    initialData?.hazards ?? [{ ...emptyHazard }]
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [electricalWorkType, setElectricalWorkType] = useState<ElectricalWorkType>(
    initialData?.electricalWorkType ?? "NOT_APPLICABLE",
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([currentUserId]);
  const [externalParticipants, setExternalParticipants] = useState("");
  const [externalCompetenceConfirmed, setExternalCompetenceConfirmed] = useState(false);
  const [fseChecklist, setFseChecklist] = useState<FseChecklist>({});

  const fetchWeather = useCallback(async (
    params: URLSearchParams,
    options: { updateWorkLocation?: boolean } = {},
  ) => {
    setIsLoadingWeather(true);
    setWeatherStatus("");
    try {
      const response = await fetch(`/api/weather?${params.toString()}`);
      const data: unknown = await response.json();
      if (!response.ok || !isSjaWeatherData(data)) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Kunne ikke hente vær for stedet";
        throw new Error(message);
      }

      setWeatherConditions(formatSjaWeatherConditions(data));
      setWeatherStatus("Værdata hentet fra MET Norway.");
      if (options.updateWorkLocation && data.displayName) {
        lastWeatherQueryRef.current = data.displayName.trim().toLocaleLowerCase("nb-NO");
        setWorkLocation(data.displayName);
      }
    } catch (error) {
      lastWeatherQueryRef.current = "";
      setWeatherStatus(error instanceof Error ? error.message : "Kunne ikke hente værdata");
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  const fetchWeatherForPlace = useCallback(async (location: string, force = false) => {
    const trimmedLocation = location.trim();
    const queryKey = trimmedLocation.toLocaleLowerCase("nb-NO");
    if (
      trimmedLocation.length < 2 ||
      (!force && queryKey === lastWeatherQueryRef.current)
    ) {
      return;
    }
    lastWeatherQueryRef.current = queryKey;
    await fetchWeather(new URLSearchParams({ q: trimmedLocation }));
  }, [fetchWeather]);

  useEffect(() => {
    const initialLocation = initialData?.workLocation || initialProjectLocation;
    if (initialLocation && !initialData?.weatherConditions) {
      void fetchWeatherForPlace(initialLocation);
    }
  }, [
    fetchWeatherForPlace,
    initialData?.weatherConditions,
    initialData?.workLocation,
    initialProjectLocation,
  ]);

  async function requestMicrophoneAccess() {
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicrophonePermission("unavailable");
      toast({
        variant: "destructive",
        title: "Mikrofon er ikke tilgjengelig",
        description:
          "Mikrofon krever en støttet nettleser og en sikker HTTPS-forbindelse.",
      });
      return;
    }

    setMicrophonePermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");
      toast({
        title: "Mikrofon er klar",
        description: "Du kan nå beskrive arbeidet med tale.",
      });
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";
      const isDenied = errorName === "NotAllowedError" || errorName === "SecurityError";
      setMicrophonePermission(isDenied ? "denied" : "unavailable");
      toast({
        variant: "destructive",
        title: isDenied ? "Mikrofontilgang ble ikke gitt" : "Ingen mikrofon funnet",
        description: isDenied
          ? "Tillat mikrofon for HMS Nova i nettleserinnstillingene, og prøv igjen."
          : "Koble til eller aktiver en mikrofon, og prøv igjen.",
      });
    }
  }

  function useCurrentPosition() {
    if (!window.isSecureContext || !navigator.geolocation) {
      setPositionPermission("unavailable");
      setWeatherStatus(
        "Posisjon krever en støttet nettleser og en sikker HTTPS-forbindelse.",
      );
      return;
    }

    setPositionPermission("requesting");
    setIsLoadingWeather(true);
    setWeatherStatus("Bekreft posisjonstilgang i nettleseren …");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPositionPermission("granted");
        void fetchWeather(
          new URLSearchParams({
            lat: coords.latitude.toString(),
            lon: coords.longitude.toString(),
          }),
          { updateWorkLocation: true },
        );
      },
      (error) => {
        const isDenied = error.code === error.PERMISSION_DENIED;
        setPositionPermission(isDenied ? "denied" : "unavailable");
        setIsLoadingWeather(false);
        setWeatherStatus(
          isDenied
            ? "Posisjonstilgang ble ikke gitt. Tillat posisjon for HMS Nova i nettleserinnstillingene, eller søk på sted."
            : "Kunne ikke hente posisjonen. Søk på sted i stedet.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 },
    );
  }

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

  async function handleGenerateSjaDraft() {
    if (workBriefing.trim().length < 10) {
      toast({
        title: "Beskriv arbeidet først",
        description: "Fortell kort hva som skal gjøres, hvor og med hvilket utstyr.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const requestData = new FormData();
      requestData.append("briefing", workBriefing);
      requestData.append("workLocation", workLocation);
      requestData.append("weatherConditions", weatherConditions);
      requestData.append("templateHint", initialData?.templateName ?? "");
      requestData.append("electricalWorkType", electricalWorkType);
      imageFiles.slice(0, 3).forEach((file) => requestData.append("images", file));

      const response = await fetch("/api/ai/sja-draft", {
        method: "POST",
        body: requestData,
      });
      const payload = (await response.json()) as {
        data?: SjaAiDraft;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Kunne ikke generere SJA-utkast");
      }

      const draft = payload.data;
      const requirementText =
        draft.specialRequirementReview.length > 0
          ? `\n\nSærkrav som må vurderes av ansvarlig:\n${draft.specialRequirementReview.map((item) => `- ${item}`).join("\n")}`
          : "";
      setFormValues({
        title: draft.title,
        description: draft.description,
        additionalConditions: [
          draft.additionalConditions,
          `Stans-kriterier:\n${draft.stopCriteria}`,
          requirementText.trim(),
        ]
          .filter(Boolean)
          .join("\n\n"),
        workMethod: draft.workMethod,
        requiredEquipment: draft.requiredEquipment,
        requiredPpe: draft.requiredPpe,
        personnelRequirements: draft.personnelRequirements,
        safetyConditions: draft.safetyConditions,
      });
      setHazards(
        draft.hazards.map((hazard) => ({
          ...hazard,
          responsibleName: "",
          linkedRiskId: null,
        })),
      );
      setElectricalWorkType(draft.electricalWorkType);
      setFseChecklist({});
      setAiDraftWarnings([
        ...draft.warnings,
        ...(draft.requiresWrittenInstruction
          ? ["Arbeidet kan kreve en egen skriftlig arbeidsinstruks. Dette må vurderes før oppstart."]
          : []),
      ]);
      setAiDraftUsed(true);
      setAiVerification({
        actualWorksiteConfirmed: false,
        workerParticipationConfirmed: false,
        barriersConfirmed: false,
        stopCriteriaConfirmed: false,
        specialRequirementsConfirmed: false,
      });
      toast({
        title: "SJA-utkast klart",
        description: "Kontroller alle felt sammen med de som skal utføre arbeidet.",
      });
    } catch (error) {
      toast({
        title: "Kunne ikke generere SJA-utkast",
        description: error instanceof Error ? error.message : "Ukjent feil",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (aiDraftUsed && Object.values(aiVerification).some((confirmed) => !confirmed)) {
      toast({
        title: "Kontroller AI-utkastet",
        description: "Alle kontrollpunktene må bekreftes før innsending.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const selectedEmployees = employees.filter((employee) =>
      selectedParticipantIds.includes(employee.id),
    );
    const externalNames = parseExternalParticipantNames(externalParticipants);
    const participants =
      electricalWorkType === "NOT_APPLICABLE"
        ? (formData.get("participants") as string)?.trim()
        : [...selectedEmployees.map((employee) => employee.name), ...externalNames].join(", ");

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
      electricalWorkType,
      workMethod: formData.get("workMethod") as string,
      requiredEquipment: formData.get("requiredEquipment") as string,
      requiredPpe: formData.get("requiredPpe") as string,
      personnelRequirements: formData.get("personnelRequirements") as string,
      safetyConditions: formData.get("safetyConditions") as string,
      fseChecklist,
      requiresSecondPerson:
        Boolean(initialData?.requiresSecondPerson) ||
        requiresSecondPersonByFse(electricalWorkType),
      secondPersonException: formData.get("secondPersonException") as string,
      participantRecords:
        electricalWorkType === "NOT_APPLICABLE"
          ? []
          : [
              ...selectedEmployees.map((employee) => ({
                userId: employee.id,
                name: employee.name,
                isExternal: false,
                competenceConfirmed: false,
              })),
              ...externalNames.map((name) => ({
                name,
                isExternal: true,
                competenceConfirmed: externalCompetenceConfirmed,
              })),
            ],
      aiGenerated: aiDraftUsed,
      aiVerification: aiDraftUsed ? aiVerification : undefined,
      hazards: validHazards.map((h, i) => ({
        ...h,
        sortOrder: i,
        linkedRiskId: h.linkedRiskId || null,
      })),
    };

    try {
      const { createSjaAnalysis } = await import("@/server/actions/sja.actions");
      const result = await createSjaAnalysis(payload);

      if (!result.success) {
        toast({
          title: "Kunne ikke opprette SJA",
          description: result.error || "Ukjent feil ved innsending",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
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

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      const titleEl = document.getElementById("title") as HTMLInputElement | null;
      const workLocationEl = document.getElementById("workLocation") as HTMLInputElement | null;
      const plannedDateEl = document.getElementById("plannedDate") as HTMLInputElement | null;
      const participantsEl = document.getElementById("participants") as HTMLTextAreaElement | null;
      const descriptionEl = document.getElementById("description") as HTMLTextAreaElement | null;
      const additionalEl = document.getElementById("additionalConditions") as HTMLTextAreaElement | null;
      const weatherEl = document.getElementById("weatherConditions") as HTMLInputElement | null;
      const selectedEmployeeNames = employees
        .filter((employee) => selectedParticipantIds.includes(employee.id))
        .map((employee) => employee.name);
      const draftParticipants =
        electricalWorkType === "NOT_APPLICABLE"
          ? participantsEl?.value || ""
          : [...selectedEmployeeNames, externalParticipants].filter(Boolean).join(", ");

      const payload = {
        id: draftId || undefined,
        tenantId,
        projectId: selectedProjectId === "__none__" ? undefined : selectedProjectId,
        title: titleEl?.value || "",
        description: descriptionEl?.value || "",
        workLocation: workLocationEl?.value || "",
        plannedDate: plannedDateEl?.value ? new Date(plannedDateEl.value).toISOString() : new Date().toISOString(),
        responsibleName: userName,
        participants: draftParticipants,
        additionalConditions: additionalEl?.value || "",
        weatherConditions: weatherEl?.value || "",
        templateId: initialData?.templateId,
        templateName: initialData?.templateName,
        electricalWorkType,
        workMethod: (document.getElementById("workMethod") as HTMLTextAreaElement | null)?.value || "",
        requiredEquipment:
          (document.getElementById("requiredEquipment") as HTMLTextAreaElement | null)?.value || "",
        requiredPpe: (document.getElementById("requiredPpe") as HTMLTextAreaElement | null)?.value || "",
        personnelRequirements:
          (document.getElementById("personnelRequirements") as HTMLTextAreaElement | null)?.value || "",
        safetyConditions:
          (document.getElementById("safetyConditions") as HTMLTextAreaElement | null)?.value || "",
        fseChecklist,
        requiresSecondPerson:
          Boolean(initialData?.requiresSecondPerson) ||
          requiresSecondPersonByFse(electricalWorkType),
        secondPersonException:
          (document.getElementById("secondPersonException") as HTMLTextAreaElement | null)?.value || "",
        hazards: hazards.map((h, i) => ({
          ...h,
          sortOrder: i,
          linkedRiskId: h.linkedRiskId || null,
        })),
      };

      const { saveSjaDraft } = await import("@/server/actions/sja.actions");
      const result = await saveSjaDraft(payload);

      if (!result.success) {
        toast({
          title: "Kunne ikke lagre utkast",
          description: result.error || "Ukjent feil",
          variant: "destructive",
        });
        return;
      }

      if (result.data?.id) {
        setDraftId(result.data.id);
      }

      toast({
        title: "Utkast lagret",
        description: "SJA-en er lagret som utkast. Du kan fortsette å fylle inn og sende inn når du er klar.",
      });
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke lagre utkast",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
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
      {aiEnabled && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Lag SJA-utkast med AI
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ta bilder og fortell med tekst eller tale hva som skal gjøres. AI fyller ut et forslag
              som dere må kontrollere sammen på arbeidsstedet.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Tale</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => void requestMicrophoneAccess()}
                  disabled={microphonePermission === "requesting"}
                >
                  {microphonePermission === "requesting" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : microphonePermission === "granted" ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4" />
                  )}
                  {microphonePermission === "granted"
                    ? "Mikrofon er tillatt"
                    : "Tillat mikrofon"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {microphonePermission === "granted"
                    ? "Du kan bruke mikrofonknappen i feltet under."
                    : "Nettleseren ber deg bekrefte før mikrofonen brukes."}
                </p>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Posisjon og vær</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={useCurrentPosition}
                  disabled={positionPermission === "requesting" || isLoadingWeather}
                >
                  {positionPermission === "requesting" || isLoadingWeather ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : positionPermission === "granted" ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <LocateFixed className="mr-2 h-4 w-4" />
                  )}
                  {positionPermission === "granted"
                    ? "Posisjon er tillatt"
                    : "Tillat posisjon og hent vær"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {positionPermission === "granted"
                    ? "Arbeidssted og vær er hentet fra enhetens posisjon."
                    : "Nettleseren ber deg bekrefte før posisjonen brukes."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workBriefing">Hva skal gjøres?</Label>
              <VoiceTextarea
                id="workBriefing"
                value={workBriefing}
                onChange={(event) => setWorkBriefing(event.target.value)}
                placeholder="Eksempel: Vi skal skifte en ventil i teknisk rom. Røret må trykkavlastes, området er trangt og andre fag arbeider i nærheten."
                rows={5}
                microphoneEnabled={microphonePermission === "granted"}
              />
            </div>

            <div className="space-y-3">
              <Input
                id="ai-sja-images"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                multiple
                onChange={handleImageChange}
                disabled={imageFiles.length >= 5}
                className="sr-only"
              />
              <Label
                htmlFor="ai-sja-images"
                className={`flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 hover:bg-muted/50 ${
                  imageFiles.length >= 5 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Camera className="h-5 w-5" />
                <span className="text-sm">
                  {imageFiles.length > 0
                    ? `${imageFiles.length} bilde(r) valgt. AI analyserer de tre første.`
                    : "Ta bilder eller velg fra enheten"}
                </span>
              </Label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {imagePreviews.map((preview, index) => (
                    <div key={preview} className="relative aspect-square overflow-hidden rounded-lg border">
                      <Image
                        src={preview}
                        alt={`Forhåndsvisning ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                        aria-label={`Fjern bilde ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleGenerateSjaDraft}
              disabled={isGeneratingDraft}
            >
              {isGeneratingDraft ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isGeneratingDraft ? "Analyserer arbeid og bilder..." : "Lag komplett SJA-utkast"}
            </Button>

            <p className="text-xs text-muted-foreground">
              Bilder brukes midlertidig til analysen. AI kan ikke kontrollere arbeidssted, utstyr,
              opplæring eller at tiltak er gjennomført.
            </p>

            {aiDraftWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <p className="mb-2 font-medium">Dette må kontrolleres:</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {aiDraftWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              value={formValues.title}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, title: event.target.value }))
              }
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
              <Select
                value={selectedProjectId}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  const projectLocation = projects.find((project) => project.id === value)?.location;
                  if (projectLocation) {
                    setWorkLocation(projectLocation);
                    void fetchWeatherForPlace(projectLocation);
                  }
                }}
              >
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
            <div className="flex gap-2">
              <Input
                id="workLocation"
                name="workLocation"
                placeholder={t("fields.workLocation.placeholder")}
                required
                value={workLocation}
                onChange={(event) => setWorkLocation(event.target.value)}
                onBlur={() => void fetchWeatherForPlace(workLocation)}
                className="h-12 text-base"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0 bg-transparent"
                onClick={useCurrentPosition}
                disabled={isLoadingWeather}
              >
                {isLoadingWeather ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Min posisjon</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weatherConditions" className="text-base flex items-center gap-1">
              <CloudSun className="h-4 w-4" />
              {t("fields.weatherConditions.label")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="weatherConditions"
                name="weatherConditions"
                placeholder={t("fields.weatherConditions.placeholder")}
                value={weatherConditions}
                onChange={(event) => setWeatherConditions(event.target.value)}
                className="h-12 text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 bg-transparent"
                onClick={() => void fetchWeatherForPlace(workLocation, true)}
                disabled={isLoadingWeather || workLocation.trim().length < 2}
                aria-label="Oppdater værdata"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingWeather ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {weatherStatus ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {weatherStatus}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base">
            {t("fields.description.label")}
          </Label>
          <VoiceTextarea
            id="description"
            name="description"
            placeholder={t("fields.description.placeholder")}
            value={formValues.description}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
            className="text-base resize-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 border-b pb-2 text-lg font-semibold">
          <Zap className="h-5 w-5 text-amber-600" />
          Arbeidsmetode og FSE
        </h3>
        <div className="space-y-2">
          <Label>Type arbeid</Label>
          <Select
            value={electricalWorkType}
            onValueChange={(value) => {
              setElectricalWorkType(value as ElectricalWorkType);
              setFseChecklist({});
            }}
          >
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_APPLICABLE">Ikke elektroarbeid</SelectItem>
              <SelectItem value="DE_ENERGIZED">Frakoblet elektrisk anlegg</SelectItem>
              <SelectItem value="NEAR_LIVE">Arbeid nær ved spenningssatt anlegg</SelectItem>
              <SelectItem value="LIVE_LOW_VOLTAGE">Arbeid under spenning – lavspenning</SelectItem>
              <SelectItem value="HIGH_VOLTAGE">Arbeid på eller nær høyspenningsanlegg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {electricalWorkType !== "NOT_APPLICABLE" && (
          <Card className="border-amber-300 bg-amber-50/60">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workMethod">Valgt arbeidsmetode *</Label>
                <VoiceTextarea
                  id="workMethod"
                  name="workMethod"
                  required
                  value={formValues.workMethod}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, workMethod: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredEquipment">Nødvendig utstyr *</Label>
                <VoiceTextarea
                  id="requiredEquipment"
                  name="requiredEquipment"
                  required
                  value={formValues.requiredEquipment}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, requiredEquipment: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredPpe">Personlig verneutstyr *</Label>
                <VoiceTextarea
                  id="requiredPpe"
                  name="requiredPpe"
                  required
                  value={formValues.requiredPpe}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, requiredPpe: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personnelRequirements">Krav og instruksjon til personell *</Label>
                <VoiceTextarea
                  id="personnelRequirements"
                  name="personnelRequirements"
                  required
                  value={formValues.personnelRequirements}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, personnelRequirements: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="safetyConditions">Sikkerhetsbetingelser</Label>
                <VoiceTextarea
                  id="safetyConditions"
                  name="safetyConditions"
                  value={formValues.safetyConditions}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, safetyConditions: event.target.value }))
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* === SEKSJON 2: Deltakere === */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("sections.participants")}
        </h3>

        {electricalWorkType === "NOT_APPLICABLE" ? (
          <div className="space-y-2">
            <Label htmlFor="participants" className="text-base">
              {t("fields.participants.label")} *
            </Label>
            <VoiceTextarea
              id="participants"
              name="participants"
              placeholder={t("fields.participants.placeholder")}
              defaultValue={initialData?.participants}
              rows={3}
              required
              className="text-base resize-none"
            />
            <p className="text-xs text-muted-foreground">{t("fields.participants.help")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {employees.map((employee) => {
                const requiredKeys = Array.from(
                  new Set([
                    ...getRequiredCourseKeys(electricalWorkType),
                    ...(initialData?.requiredCourseKeys ?? []),
                  ]),
                );
                const missingKeys = requiredKeys.filter(
                  (key) => !employee.validCourseKeys.includes(key),
                );
                const hasCompetenceGap =
                  missingKeys.length > 0 ||
                  employee.expiredCourseKeys.some((key) => requiredKeys.includes(key));
                return (
                  <label
                    key={employee.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3"
                  >
                    <Checkbox
                      checked={selectedParticipantIds.includes(employee.id)}
                      onCheckedChange={(checked) =>
                        setSelectedParticipantIds((current) =>
                          checked === true
                            ? Array.from(new Set([...current, employee.id]))
                            : current.filter((id) => id !== employee.id),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{employee.name}</span>
                      <span className={hasCompetenceGap ? "text-xs text-destructive" : "text-xs text-green-700"}>
                        {hasCompetenceGap ? "Mangler gyldig obligatorisk opplæring" : "Kompetanse kontrollert"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalParticipants">Eksterne deltakere</Label>
              <Input
                id="externalParticipants"
                value={externalParticipants}
                onChange={(event) => setExternalParticipants(event.target.value)}
                placeholder="Navn, separert med komma"
              />
              {externalParticipants.trim() && (
                <label className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Checkbox
                    checked={externalCompetenceConfirmed}
                    onCheckedChange={(checked) => setExternalCompetenceConfirmed(checked === true)}
                  />
                  <span className="text-sm">
                    Jeg bekrefter at ekstern deltakers FSE- og førstehjelpskompetanse er kontrollert.
                  </span>
                </label>
              )}
            </div>
          </div>
        )}
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
            <VoiceTextarea
              id="additionalConditions"
              name="additionalConditions"
              placeholder={t("fields.additionalConditions.placeholder")}
              value={formValues.additionalConditions}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, additionalConditions: event.target.value }))
              }
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
                <VoiceTextarea
                  value={hazard.measures}
                  onChange={(e) => updateHazard(index, "measures", e.target.value)}
                  placeholder={t("hazards.measuresPlaceholder")}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              {risks.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-sm">Koble til risiko</Label>
                  <Select
                    value={hazard.linkedRiskId ?? "__none__"}
                    onValueChange={(v) =>
                      updateHazard(index, "linkedRiskId", v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Velg risiko (valgfritt)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Ingen kobling</SelectItem>
                      {risks.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.title}
                          {risk.score != null ? ` (score: ${risk.score})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      {electricalWorkType !== "NOT_APPLICABLE" && (
        <Card className="border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-amber-600" />
              FSE-kontroll før oppstart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* FSE §§ 10 og 14: punktene må bekreftes for det konkrete arbeidet. */}
            {getRequiredChecklistKeys(electricalWorkType).map((key) => (
              <label key={key} className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={fseChecklist[key] === true}
                  onCheckedChange={(checked) =>
                    setFseChecklist((current) => ({ ...current, [key]: checked === true }))
                  }
                />
                <span className="text-sm">{fseChecklistItems[key]}</span>
              </label>
            ))}
            {(initialData?.requiresSecondPerson ||
              requiresSecondPersonByFse(electricalWorkType)) &&
              selectedParticipantIds.length +
                parseExternalParticipantNames(externalParticipants).length <
                2 && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="secondPersonException">
                    Begrunnelse dersom person nummer to ikke benyttes
                  </Label>
                  <VoiceTextarea
                    id="secondPersonException"
                    name="secondPersonException"
                    rows={3}
                    placeholder="Dokumenter den konkrete risikovurderingen som viser at fravik ikke øker risikoen."
                  />
                </div>
              )}
          </CardContent>
        </Card>
      )}

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
          {aiDraftUsed && (
            <div className="space-y-2 border-t border-green-300 pt-4">
              <p className="font-medium text-green-950">
                AI-utkastet må kontrolleres før innsending
              </p>
              {([
                ["actualWorksiteConfirmed", "Arbeidssted, vær, utstyr og samtidige aktiviteter er kontrollert fysisk."],
                ["workerParticipationConfirmed", "De som skal utføre arbeidet har medvirket og gitt innspill."],
                ["barriersConfirmed", "Eksisterende barrierer og foreslåtte tiltak er kontrollert og gjennomførbare."],
                ["stopCriteriaConfirmed", "Stans-kriteriene er gjennomgått og forstått av deltakerne."],
                ["specialRequirementsConfirmed", "Særkrav, arbeidsinstruks, SHA/FSE og kompetansebehov er vurdert."],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 rounded-lg border border-green-300 bg-white p-3">
                  <Checkbox
                    checked={aiVerification[key]}
                    onCheckedChange={(checked) =>
                      setAiVerification((current) => ({
                        ...current,
                        [key]: checked === true,
                      }))
                    }
                  />
                  <span className="text-sm text-green-950">{label}</span>
                </label>
              ))}
              <p className="text-xs text-green-800">
                SJA er en konkret risikovurdering og erstatter ikke SHA-plan, påkrevd arbeidsinstruks,
                opplæring eller kontroll av utstyr.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || isSavingDraft}
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
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={isSubmitting || isSavingDraft}
          size="lg"
          className="w-full h-12"
        >
          {isSavingDraft ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Lagrer...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Lagre som utkast
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting || isSavingDraft}
          size="lg"
          className="w-full h-12"
        >
          {t("actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
