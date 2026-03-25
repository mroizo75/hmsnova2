"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createIncident } from "@/server/actions/incident.actions";
import {
  generateAiIncidentCaseDraft,
  runAiIncidentQualityCheck,
} from "@/server/actions/ai-assistant.actions";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  X,
  AlertTriangle,
  BarChart3,
  Users,
  WifiOff,
  CloudUpload,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import type { IncidentType } from "@prisma/client";
import { cn } from "@/lib/utils";

interface SubcategoryOption {
  id: string;
  key: string;
  label: string;
  industry: string;
}

interface IncidentFormProps {
  tenantId: string;
  userId: string;
  risks: Array<{ id: string; title: string; category: string; score: number }>;
  users: Array<{ id: string; name: string | null; email: string }>;
  projects: Array<{ id: string; name: string; code: string | null; status: string }>;
  defaultType?: IncidentType;
  defaultProjectId?: string;
  isTabletMode?: boolean;
  templatePreset?: "homeVisitRisk" | "violenceThreat" | "infectionExposure";
}

interface OfflineIncidentQueueItem {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface AiMeasureSuggestion {
  title: string;
  selected: boolean;
}

interface IncidentAiPrefs {
  deselectedMeasureTitles: string[];
}

interface TemplatePresetDefaults {
  type: IncidentType;
  titleKey: string;
  descriptionKey: string;
  locationKey: string;
  immediateActionKey: string;
}

const OFFLINE_INCIDENT_QUEUE_KEY = "hmsnova.offline.incidentQueue.v1";
const getIncidentAiPrefsKey = (userId: string) => `hmsnova.incident.aiPrefs.v1.${userId}`;

/**
 * Hendelsestyper basert på AML § 5-1, § 5-2 og IK-HMS § 5.
 * ULYKKE/NESTEN/FARLIG_SITUASJON = AML § 5-2 og § 2-3
 * YRKESSYKDOM = AML § 5-1 (registreringsplikt) og § 5-3 (leges meldeplikt)
 * AVVIK = IK-HMS § 5 og ISO 9001 kap. 10.2
 */
const incidentTypes: Array<{
  value: IncidentType;
  labelKey: string;
  descKey: string;
  badgeKey?: string;
  group: "hms" | "avvik" | "annet";
}> = [
  {
    value: "ULYKKE",
    labelKey: "types.ULYKKE.label",
    descKey: "types.ULYKKE.desc",
    badgeKey: "types.ULYKKE.badge",
    group: "hms",
  },
  {
    value: "NESTEN",
    labelKey: "types.NESTEN.label",
    descKey: "types.NESTEN.desc",
    badgeKey: "types.NESTEN.badge",
    group: "hms",
  },
  {
    value: "FARLIG_SITUASJON",
    labelKey: "types.FARLIG_SITUASJON.label",
    descKey: "types.FARLIG_SITUASJON.desc",
    badgeKey: "types.FARLIG_SITUASJON.badge",
    group: "hms",
  },
  {
    value: "YRKESSYKDOM",
    labelKey: "types.YRKESSYKDOM.label",
    descKey: "types.YRKESSYKDOM.desc",
    badgeKey: "types.YRKESSYKDOM.badge",
    group: "hms",
  },
  {
    value: "AVVIK",
    labelKey: "types.AVVIK.label",
    descKey: "types.AVVIK.desc",
    group: "avvik",
  },
  {
    value: "MILJO",
    labelKey: "types.MILJO.label",
    descKey: "types.MILJO.desc",
    group: "avvik",
  },
  {
    value: "KVALITET",
    labelKey: "types.KVALITET.label",
    descKey: "types.KVALITET.desc",
    group: "avvik",
  },
  {
    value: "CUSTOMER",
    labelKey: "types.CUSTOMER.label",
    descKey: "types.CUSTOMER.desc",
    group: "annet",
  },
];

// Typer som aktiverer RUH/HMS-spesifikke seksjoner
const HMS_TYPES: IncidentType[] = ["ULYKKE", "NESTEN", "FARLIG_SITUASJON", "YRKESSYKDOM"];
// Typer som aktiverer HSE-statistikk (TRIR)
const HSE_STATS_TYPES: IncidentType[] = ["ULYKKE", "NESTEN", "YRKESSYKDOM"];

const severityLevels = [
  { value: 1, labelKey: "severity.1.label", descKey: "severity.1.desc" },
  { value: 2, labelKey: "severity.2.label", descKey: "severity.2.desc" },
  { value: 3, labelKey: "severity.3.label", descKey: "severity.3.desc" },
  { value: 4, labelKey: "severity.4.label", descKey: "severity.4.desc" },
  { value: 5, labelKey: "severity.5.label", descKey: "severity.5.desc" },
];

const NO_RISK_REFERENCE_VALUE = "__none_risk_reference__";

const NO_PROJECT_VALUE = "__none_project__";

export function IncidentForm({
  tenantId,
  userId,
  risks = [],
  users = [],
  projects = [],
  defaultType,
  defaultProjectId,
  isTabletMode = false,
  templatePreset,
}: IncidentFormProps) {
  const t = useTranslations("incidentForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<IncidentType | "">(
    defaultType || ""
  );
  const NO_REPORTED_FOR_VALUE = "__none__";
  const [reportedForUserId, setReportedForUserId] = useState<string>(
    NO_REPORTED_FOR_VALUE
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Underkategorier
  const [subcategoryOptions, setSubcategoryOptions] = useState<SubcategoryOption[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Prosjektvelger
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId ?? NO_PROJECT_VALUE
  );
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [aiMeasureSuggestions, setAiMeasureSuggestions] = useState<AiMeasureSuggestion[]>([]);
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const [immediateActionValue, setImmediateActionValue] = useState("");
  const [suggestedActionsValue, setSuggestedActionsValue] = useState("");
  const [aiDeselectedTitles, setAiDeselectedTitles] = useState<Set<string>>(new Set());

  // HSE-statistikk
  const [isFatal, setIsFatal] = useState(false);
  const [isLostTimeIncident, setIsLostTimeIncident] = useState(false);
  const [isRestrictedWork, setIsRestrictedWork] = useState(false);
  const [medicalAttentionRequired, setMedicalAttentionRequired] = useState(false);

  const templateDefaults: Record<
    NonNullable<IncidentFormProps["templatePreset"]>,
    TemplatePresetDefaults
  > = {
    homeVisitRisk: {
      type: "FARLIG_SITUASJON",
      titleKey: "templates.homeVisitRisk.title",
      descriptionKey: "templates.homeVisitRisk.description",
      locationKey: "templates.homeVisitRisk.location",
      immediateActionKey: "templates.homeVisitRisk.immediateAction",
    },
    violenceThreat: {
      type: "ULYKKE",
      titleKey: "templates.violenceThreat.title",
      descriptionKey: "templates.violenceThreat.description",
      locationKey: "templates.violenceThreat.location",
      immediateActionKey: "templates.violenceThreat.immediateAction",
    },
    infectionExposure: {
      type: "FARLIG_SITUASJON",
      titleKey: "templates.infectionExposure.title",
      descriptionKey: "templates.infectionExposure.description",
      locationKey: "templates.infectionExposure.location",
      immediateActionKey: "templates.infectionExposure.immediateAction",
    },
  };
  const activeTemplate = templatePreset ? templateDefaults[templatePreset] : null;

  const isHmsType = selectedType ? HMS_TYPES.includes(selectedType as IncidentType) : false;
  const isHseStatsType = selectedType ? HSE_STATS_TYPES.includes(selectedType as IncidentType) : false;
  const isCustomerType = selectedType === "CUSTOMER";

  useEffect(() => {
    if (!isTabletMode || typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(OFFLINE_INCIDENT_QUEUE_KEY);
      const queue = raw ? (JSON.parse(raw) as OfflineIncidentQueueItem[]) : [];
      setOfflineQueueCount(queue.length);
    } catch {
      setOfflineQueueCount(0);
    }
  }, [isTabletMode]);

  useEffect(() => {
    if (!selectedType && activeTemplate?.type) {
      setSelectedType(activeTemplate.type);
    }
  }, [activeTemplate, selectedType]);

  useEffect(() => {
    if (activeTemplate?.immediateActionKey && immediateActionValue.length === 0) {
      setImmediateActionValue(t(activeTemplate.immediateActionKey));
    }
  }, [activeTemplate, immediateActionValue.length, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(getIncidentAiPrefsKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as IncidentAiPrefs;
      const values = Array.isArray(parsed.deselectedMeasureTitles)
        ? parsed.deselectedMeasureTitles
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
        : [];
      setAiDeselectedTitles(new Set(values));
    } catch {
      // ignore invalid local cache
    }
  }, [userId]);

  const persistAiPrefs = (nextDeselectedTitles: Set<string>) => {
    if (typeof window === "undefined") return;
    const payload: IncidentAiPrefs = {
      deselectedMeasureTitles: Array.from(nextDeselectedTitles),
    };
    window.localStorage.setItem(getIncidentAiPrefsKey(userId), JSON.stringify(payload));
  };

  const fetchSubcategories = useCallback(async (type: IncidentType) => {
    setLoadingSubcategories(true);
    setSelectedSubcategories([]);
    try {
      const res = await fetch(`/api/incidents/subcategories?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategoryOptions(data.options ?? []);
      }
    } catch {
      setSubcategoryOptions([]);
    } finally {
      setLoadingSubcategories(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchSubcategories(selectedType as IncidentType);
    } else {
      setSubcategoryOptions([]);
      setSelectedSubcategories([]);
    }
  }, [selectedType, fetchSubcategories]);

  function toggleSubcategory(key: string) {
    setSelectedSubcategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const merged = [...imageFiles, ...files].slice(0, 5);
    setImageFiles(merged);
    setImagePreviews(merged.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }

  const handleGenerateAi = async () => {
    const titleInput = (document.getElementById("title") as HTMLInputElement | null)?.value || "";
    const descriptionInput = (document.getElementById("description") as HTMLTextAreaElement | null)?.value || "";
    if (!selectedType || titleInput.trim().length < 2 || descriptionInput.trim().length < 10) {
      toast({
        variant: "destructive",
        title: t("toasts.missingBasis.title"),
        description: t("toasts.missingBasis.description"),
      });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const result = await generateAiIncidentCaseDraft({
        type: selectedType,
        title: titleInput,
        description: descriptionInput,
        severity: Number((document.querySelector('[name=\"severity\"]') as HTMLInputElement | null)?.value || 3),
      });
      if (!result.success || !result.data) {
        toast({
          variant: "destructive",
          title: t("toasts.aiAnalysisFailed.title"),
          description: result.error || t("toasts.unknownError"),
        });
        return;
      }
      setImmediateActionValue(result.data.immediateAction);
      setSuggestedActionsValue(result.data.suggestedActions.join("\n"));
      setAiMeasureSuggestions(
        result.data.suggestedActions.map((item) => ({
          title: item,
          selected: !aiDeselectedTitles.has(item),
        }))
      );
      toast({
        title: t("toasts.aiSuggestionsReady.title"),
        description: t("toasts.aiSuggestionsReady.description"),
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleQualityCheck = async () => {
    const titleInput = (document.getElementById("title") as HTMLInputElement | null)?.value || "";
    const descriptionInput = (document.getElementById("description") as HTMLTextAreaElement | null)?.value || "";
    if (!selectedType || titleInput.trim().length < 2 || descriptionInput.trim().length < 10) {
      return;
    }
    setIsCheckingQuality(true);
    try {
      const result = await runAiIncidentQualityCheck({
        type: selectedType,
        title: titleInput,
        description: descriptionInput,
        immediateAction: immediateActionValue,
        suggestedActions: suggestedActionsValue,
        severity: Number((document.querySelector('[name=\"severity\"]') as HTMLInputElement | null)?.value || 3),
      });
      if (result.success && result.data) {
        setQualityWarnings(result.data.warnings);
      }
    } finally {
      setIsCheckingQuality(false);
    }
  };

  const toggleAiMeasureSuggestion = (title: string, checked: boolean) => {
    setAiMeasureSuggestions((previous) =>
      previous.map((item) => (item.title === title ? { ...item, selected: checked } : item))
    );
    setAiDeselectedTitles((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.delete(title);
      } else {
        next.add(title);
      }
      persistAiPrefs(next);
      return next;
    });
  };

  function readOfflineQueue(): OfflineIncidentQueueItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(OFFLINE_INCIDENT_QUEUE_KEY);
      const queue = raw ? (JSON.parse(raw) as OfflineIncidentQueueItem[]) : [];
      return Array.isArray(queue) ? queue : [];
    } catch {
      return [];
    }
  }

  function writeOfflineQueue(queue: OfflineIncidentQueueItem[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OFFLINE_INCIDENT_QUEUE_KEY, JSON.stringify(queue));
    setOfflineQueueCount(queue.length);
  }

  async function syncOfflineQueue() {
    const queue = readOfflineQueue();
    if (queue.length === 0) {
      toast({
        title: t("toasts.noStoredIncidents.title"),
        description: t("toasts.noStoredIncidents.description"),
      });
      return;
    }

    if (!navigator.onLine) {
      toast({
        variant: "destructive",
        title: t("toasts.noNetwork.title"),
        description: t("toasts.noNetwork.description"),
      });
      return;
    }

    setIsSyncingOfflineQueue(true);
    let successCount = 0;
    const failed: OfflineIncidentQueueItem[] = [];

    for (const item of queue) {
      try {
        const response = await fetch("/api/incidents/offline-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (!response.ok) {
          failed.push(item);
          continue;
        }
        successCount += 1;
      } catch {
        failed.push(item);
      }
    }

    writeOfflineQueue(failed);
    setIsSyncingOfflineQueue(false);

    if (successCount > 0) {
      toast({
        title: t("toasts.syncCompleted.title"),
        description: t("toasts.syncCompleted.description", { count: successCount }),
      });
      router.refresh();
    }

    if (failed.length > 0) {
      toast({
        variant: "destructive",
        title: t("toasts.someIncidentsFailed.title"),
        description: t("toasts.someIncidentsFailed.description", { count: failed.length }),
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawRiskReferenceId = formData.get("riskReferenceId") as string | null;

    const data = {
      tenantId,
      type: formData.get("type") as IncidentType,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      severity: parseInt(formData.get("severity") as string),
      occurredAt: formData.get("occurredAt") as string,
      reportedBy: userId,
      location: (formData.get("location") as string) || undefined,
      witnessName: (formData.get("witnessName") as string) || undefined,
      immediateAction: (formData.get("immediateAction") as string) || undefined,
      injuryType: (formData.get("injuryType") as string) || undefined,
      medicalAttentionRequired,
      lostTimeMinutes: formData.get("lostTimeMinutes")
        ? parseInt(formData.get("lostTimeMinutes") as string, 10)
        : undefined,
      reportedForUserId:
        reportedForUserId && reportedForUserId !== NO_REPORTED_FOR_VALUE
          ? reportedForUserId
          : undefined,
      riskReferenceId:
        rawRiskReferenceId && rawRiskReferenceId !== NO_RISK_REFERENCE_VALUE
          ? rawRiskReferenceId
          : undefined,
      customerName: (formData.get("customerName") as string) || undefined,
      customerEmail: (formData.get("customerEmail") as string) || undefined,
      customerPhone: (formData.get("customerPhone") as string) || undefined,
      customerTicketId: (formData.get("customerTicketId") as string) || undefined,
      responseDeadline: (formData.get("responseDeadline") as string) || undefined,
      customerSatisfaction: formData.get("customerSatisfaction")
        ? parseInt(formData.get("customerSatisfaction") as string, 10)
        : undefined,
      // Prosjektkobling
      projectId:
        selectedProjectId !== NO_PROJECT_VALUE ? selectedProjectId : undefined,
      // Underkategorier
      subcategoryKeys: selectedSubcategories,
      // RUH-felt
      involvedPersons: (formData.get("involvedPersons") as string) || undefined,
      injuryDescription: (formData.get("injuryDescription") as string) || undefined,
      suggestedActions: (formData.get("suggestedActions") as string) || undefined,
      aiSuggestedMeasures: aiMeasureSuggestions
        .filter((item) => item.selected)
        .map((item) => item.title),
      // HSE-statistikk
      isFatal,
      isLostTimeIncident,
      lostWorkdays: formData.get("lostWorkdays")
        ? parseInt(formData.get("lostWorkdays") as string, 10)
        : undefined,
      isRestrictedWork,
    };

    if (isTabletMode && !navigator.onLine) {
      const queue = readOfflineQueue();
      queue.push({
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        payload: data as unknown as Record<string, unknown>,
      });
      writeOfflineQueue(queue);
      toast({
        title: t("toasts.savedOffline.title"),
        description:
          imageFiles.length > 0
            ? t("toasts.savedOffline.withImages")
            : t("toasts.savedOffline.withoutImages"),
      });
      setLoading(false);
      e.currentTarget.reset();
      setSelectedSubcategories([]);
      return;
    }

    try {
      const result = await createIncident(data);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: t("toasts.error.title"),
          description: result.error || t("toasts.error.reportIncident"),
        });
        return;
      }

      if (imageFiles.length > 0 && result.data?.id) {
        const imgFormData = new FormData();
        imageFiles.forEach((file) => imgFormData.append("images", file));
        await fetch(`/api/incidents/${result.data.id}/attachments`, {
          method: "POST",
          body: imgFormData,
        });
      }

      const redirectRoute =
        result.data?.type === "CUSTOMER"
          ? "/dashboard/complaints"
          : "/dashboard/incidents";
      toast({
        title: t("toasts.incidentReported.title"),
        description: t("toasts.incidentReported.description"),
        className: "bg-green-50 border-green-200",
      });
      router.push(redirectRoute);
    } catch {
      toast({
        variant: "destructive",
        title: t("toasts.unexpectedError.title"),
        description: t("toasts.unexpectedError.description"),
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = incidentTypes.find((t) => t.value === selectedType);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "space-y-6",
        isTabletMode &&
          "space-y-8 pb-24 [&_button]:min-h-12 [&_input]:h-12 [&_input]:text-base [&_textarea]:text-base [&_[data-slot='select-trigger']]:min-h-12 [&_[data-slot='select-trigger']]:text-base",
      )}
    >
      {isTabletMode && (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <WifiOff className="h-4 w-4" />
                {t("tabletMode.offlineQueue", { count: offlineQueueCount })}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={syncOfflineQueue}
                disabled={isSyncingOfflineQueue || offlineQueueCount === 0}
                className="gap-2"
              >
                <CloudUpload className="h-4 w-4" />
                {isSyncingOfflineQueue ? t("tabletMode.syncing") : t("tabletMode.syncSaved")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Grunnleggende informasjon ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.basicInfo.title")}</CardTitle>
          <CardDescription>
            {t("sections.basicInfo.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">{t("fields.type.label")}</Label>
              <Select
                name="type"
                required
                disabled={loading}
                value={selectedType || activeTemplate?.type || undefined}
                onValueChange={(value) =>
                  setSelectedType(value as IncidentType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.type.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("fields.type.groupHms")}
                  </div>
                  {incidentTypes
                    .filter((t) => t.group === "hms")
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t">
                    {t("fields.type.groupDeviation")}
                  </div>
                  {incidentTypes
                    .filter((t) => t.group === "avvik")
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t">
                    {t("fields.type.groupOther")}
                  </div>
                  {incidentTypes
                    .filter((t) => t.group === "annet")
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedTypeInfo && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t(selectedTypeInfo.descKey)}
                  </p>
                  {selectedTypeInfo.badgeKey && (
                    <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      {t(selectedTypeInfo.badgeKey)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">{t("fields.severity.label")}</Label>
              <Select name="severity" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.severity.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.map((level) => (
                    <SelectItem
                      key={level.value}
                      value={level.value.toString()}
                    >
                      {t(level.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{t("aiHelp.title")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleGenerateAi} disabled={loading || isGeneratingAi}>
                {isGeneratingAi ? t("aiHelp.generating") : t("aiHelp.analyzeAndSuggest")}
              </Button>
              <Button type="button" variant="outline" onClick={handleQualityCheck} disabled={loading || isCheckingQuality}>
                {isCheckingQuality ? t("aiHelp.checking") : t("aiHelp.qualityCheck")}
              </Button>
            </div>
            {qualityWarnings.length > 0 && (
              <div className="rounded-md border bg-amber-50 p-2 text-xs text-amber-900">
                <p className="font-medium mb-1">{t("aiHelp.improvementPoints")}</p>
                <ul className="list-disc ml-4 space-y-1">
                  {qualityWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiMeasureSuggestions.length > 0 && (
              <div className="rounded-md border bg-green-50 p-2 text-xs text-green-900">
                <p className="font-medium flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("aiHelp.selectMeasures")}
                </p>
                <div className="space-y-1">
                  {aiMeasureSuggestions.map((item) => (
                    <label key={item.title} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(value) => toggleAiMeasureSuggestion(item.title, value === true)}
                      />
                      <span>{item.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Prosjektvelger ── */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label>{t("fields.project.label")}</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.project.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>{t("fields.project.noneOption")}</SelectItem>
                  {projects
                    .filter((p) => p.status === "ACTIVE" || p.status === "PLANNING")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.code ? ` (${p.code})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("fields.project.help")}
              </p>
            </div>
          )}

          {/* ── Underkategorier (sjekkbokser) ── */}
          {selectedType && subcategoryOptions.length > 0 && (
            <div className="space-y-3">
              <Label>
                {t("fields.subcategories.label")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {t("fields.subcategories.hint")}
                </span>
              </Label>
              {loadingSubcategories ? (
                <p className="text-xs text-muted-foreground">{t("fields.subcategories.loading")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 rounded-lg border bg-muted/30 p-4">
                  {subcategoryOptions.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={selectedSubcategories.includes(opt.key)}
                        onCheckedChange={() => toggleSubcategory(opt.key)}
                        disabled={loading}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">{t("fields.title.label")}</Label>
            <Input
              id="title"
              name="title"
              placeholder={t("fields.title.placeholder")}
              defaultValue={activeTemplate ? t(activeTemplate.titleKey) : undefined}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("fields.description.label")}</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={t("fields.description.placeholder")}
              defaultValue={activeTemplate ? t(activeTemplate.descriptionKey) : undefined}
              required
              disabled={loading}
              rows={5}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="occurredAt">{t("fields.occurredAt.label")}</Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                type="datetime-local"
                required
                disabled={loading}
                max={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("fields.location.label")}</Label>
              <Input
                id="location"
                name="location"
                placeholder={t("fields.location.placeholder")}
                defaultValue={activeTemplate ? t(activeTemplate.locationKey) : undefined}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="witnessName">{t("fields.witnessName.label")}</Label>
            <Input
              id="witnessName"
              name="witnessName"
              placeholder={t("fields.witnessName.placeholder")}
              disabled={loading}
            />
          </div>

          {users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="reportedForUserId">
                {t("fields.reportedForUser.label")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {t("fields.reportedForUser.hint")}
                </span>
              </Label>
              <Select
                value={reportedForUserId}
                onValueChange={setReportedForUserId}
                disabled={loading}
              >
                <SelectTrigger id="reportedForUserId">
                  <SelectValue placeholder={t("fields.reportedForUser.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REPORTED_FOR_VALUE}>
                    {t("fields.reportedForUser.noneOption")}
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── RUH / HMS-spesifikke felt ── */}
      {isHmsType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              {t("sections.hmsSpecific.title")}
            </CardTitle>
            <CardDescription>
              {t("sections.hmsSpecific.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="involvedPersons">{t("fields.involvedPersons.label")}</Label>
              <Textarea
                id="involvedPersons"
                name="involvedPersons"
                placeholder={t("fields.involvedPersons.placeholder")}
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="injuryDescription">{t("fields.injuryDescription.label")}</Label>
              <Textarea
                id="injuryDescription"
                name="injuryDescription"
                placeholder={t("fields.injuryDescription.placeholder")}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="injuryType">{t("fields.injuryTypeDetailed.label")}</Label>
                <Input
                  id="injuryType"
                  name="injuryType"
                  placeholder={t("fields.injuryType.placeholder")}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskReferenceId">{t("fields.riskReference.label")}</Label>
                <Select
                  name="riskReferenceId"
                  disabled={loading || risks.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        risks.length
                          ? t("fields.riskReference.placeholder")
                          : t("fields.riskReference.noneAvailable")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RISK_REFERENCE_VALUE}>
                      {t("fields.riskReference.noneOption")}
                    </SelectItem>
                    {risks.map((risk) => (
                      <SelectItem key={risk.id} value={risk.id}>
                        {t("fields.riskReference.optionWithScore", { title: risk.title, score: risk.score })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggestedActions">{t("fields.suggestedActions.label")}</Label>
              <Textarea
                id="suggestedActions"
                name="suggestedActions"
                placeholder={t("fields.suggestedActions.placeholder")}
              value={suggestedActionsValue}
              onChange={(event) => setSuggestedActionsValue(event.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── HSE-statistikk (TRIR) ── */}
      {isHseStatsType && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              {t("sections.hseStats.title")}
            </CardTitle>
            <CardDescription>
              {t("sections.hseStats.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isFatal}
                    onCheckedChange={(v) => setIsFatal(!!v)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">{t("hseMetrics.fatality.label")}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t("hseMetrics.fatality.short")}</span>
              </label>

              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isLostTimeIncident}
                    onCheckedChange={(v) => setIsLostTimeIncident(!!v)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">{t("hseMetrics.lti.label")}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t("hseMetrics.lti.short")}</span>
              </label>

              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isRestrictedWork}
                    onCheckedChange={(v) => setIsRestrictedWork(!!v)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">{t("hseMetrics.restrictedWork.label")}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("hseMetrics.restrictedWork.short")}
                </span>
              </label>

              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={medicalAttentionRequired}
                    onCheckedChange={(v) =>
                      setMedicalAttentionRequired(!!v)
                    }
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">{t("hseMetrics.medicalTreatment.label")}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("hseMetrics.medicalTreatment.short")}
                </span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lostWorkdays">{t("fields.lostWorkdays.label")}</Label>
                <Input
                  id="lostWorkdays"
                  name="lostWorkdays"
                  type="number"
                  min={0}
                  placeholder={t("fields.lostWorkdays.placeholder")}
                  disabled={loading || !isLostTimeIncident}
                />
                <p className="text-xs text-muted-foreground">
                  {t("fields.lostWorkdays.hint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lostTimeMinutes">{t("fields.lostTimeMinutes.label")}</Label>
                <Input
                  id="lostTimeMinutes"
                  name="lostTimeMinutes"
                  type="number"
                  min={0}
                  placeholder={t("fields.lostTimeMinutes.placeholder")}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rounded-md bg-orange-100 border border-orange-200 px-4 py-3 text-xs text-orange-900">
              <strong>{t("sections.hseStats.trirLabel")}</strong> {t("sections.hseStats.trirFormula")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Legebehandling for ikke-TRIR-typer ── */}
      {!isHseStatsType && !isCustomerType && (
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.injuryFollowUp.title")}</CardTitle>
            <CardDescription>
              {t("sections.injuryFollowUp.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="injuryType">{t("fields.injuryType.label")}</Label>
                <Input
                  id="injuryType"
                  name="injuryType"
                  placeholder={t("fields.injuryType.placeholder")}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskReferenceId">{t("fields.riskReference.label")}</Label>
                <Select
                  name="riskReferenceId"
                  disabled={loading || risks.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        risks.length
                          ? t("fields.riskReference.placeholder")
                          : t("fields.riskReference.noneAvailable")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RISK_REFERENCE_VALUE}>
                      {t("fields.riskReference.noneOption")}
                    </SelectItem>
                    {risks.map((risk) => (
                      <SelectItem key={risk.id} value={risk.id}>
                        {t("fields.riskReference.optionWithScore", { title: risk.title, score: risk.score })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Kundeklage ── */}
      {isCustomerType && (
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.customerComplaint.title")}</CardTitle>
            <CardDescription>
              {t("sections.customerComplaint.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">{t("fields.customerName.label")}</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder={t("fields.customerName.placeholder")}
                  disabled={loading}
                  required={isCustomerType}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">{t("fields.customerEmail.label")}</Label>
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  placeholder={t("fields.customerEmail.placeholder")}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerPhone">{t("fields.customerPhone.label")}</Label>
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  placeholder={t("fields.customerPhone.placeholder")}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerTicketId">{t("fields.customerTicketId.label")}</Label>
                <Input
                  id="customerTicketId"
                  name="customerTicketId"
                  placeholder={t("fields.customerTicketId.placeholder")}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="responseDeadline">{t("fields.responseDeadline.label")}</Label>
                <Input
                  id="responseDeadline"
                  name="responseDeadline"
                  type="date"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerSatisfaction">{t("fields.customerSatisfaction.label")}</Label>
                <Select name="customerSatisfaction" disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("fields.customerSatisfaction.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <SelectItem key={v} value={v.toString()}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Umiddelbare tiltak ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.immediateActions.title")}</CardTitle>
          <CardDescription>
            {t("sections.immediateActions.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="immediateAction">{t("fields.immediateAction.label")}</Label>
            <Textarea
              id="immediateAction"
              name="immediateAction"
              placeholder={t("fields.immediateAction.placeholder")}
              value={immediateActionValue}
              onChange={(event) => setImmediateActionValue(event.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Bilder ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.images.title")}</CardTitle>
          <CardDescription>
            {t("sections.images.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              id="incident-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={loading || imageFiles.length >= 5}
              className="sr-only"
            />
            <Label
              htmlFor="incident-images"
              className={`flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                imageFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {imageFiles.length >= 5
                    ? t("sections.images.maxReached")
                    : t("sections.images.clickToAdd")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {imageFiles.length > 0
                    ? t("sections.images.selectedCount", { count: imageFiles.length })
                    : t("sections.images.supportedFormats")}
                </p>
              </div>
            </Label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border"
                >
                  <Image
                    src={preview}
                    alt={t("sections.images.previewAlt", { index: index + 1 })}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lovforankring-info ── */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {t("afterReporting.title")}
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <ul className="space-y-1 list-disc list-inside ml-2">
            <li>{t("afterReporting.point1")}</li>
            <li>{t("afterReporting.point2")}</li>
            <li>{t("afterReporting.point3")}</li>
            {isHseStatsType && (
              <li className="font-medium">
                {t("afterReporting.point4Hse")}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className={cn("flex gap-4", isTabletMode && "sticky bottom-4 z-20 rounded-lg border bg-background p-3 shadow-lg")}>
        <Button type="submit" disabled={loading}>
          {loading ? t("actions.submitting") : t("actions.submit")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          {t("actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
