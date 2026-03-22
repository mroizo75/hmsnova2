"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Sparkles } from "lucide-react";
import { generateAiInspectionSummary } from "@/server/actions/ai-assistant.actions";
import { useTranslations } from "next-intl";

type ChecklistEntry =
  | { type: "heading"; title: string }
  | {
      type: "item";
      title: string;
      checked: boolean;
      status?: "OK" | "NOT_OK" | "UNSET";
      findingTitle?: string;
      findingDescription?: string;
      findingSeverity?: number;
      findingLocation?: string;
      findingImageKeys?: string[];
      linkedFindingId?: string;
    };

interface InspectionChecklistProps {
  inspectionId: string;
  checklist: unknown;
}

function normalizeChecklistEntries(checklist: unknown): ChecklistEntry[] {
  if (!checklist || typeof checklist !== "object") return [];
  const rawItems = (checklist as { items?: unknown[] }).items;
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((entry): ChecklistEntry | null => {
      if (typeof entry === "string") {
        return { type: "item", title: entry, checked: false };
      }

      if (!entry || typeof entry !== "object") {
        return null;
      }

      const typed = entry as {
        type?: string;
        title?: string;
        checked?: boolean;
        status?: "OK" | "NOT_OK" | "UNSET";
        findingTitle?: string;
        findingDescription?: string;
        findingSeverity?: number;
        findingLocation?: string;
        findingImageKeys?: string[];
        linkedFindingId?: string;
      };
      const title = String(typed.title || "").trim();
      if (!title) return null;

      if (typed.type === "heading") {
        return { type: "heading", title };
      }

      return {
        type: "item",
        title,
        checked: typed.checked === true,
        status:
          typed.status === "OK" || typed.status === "NOT_OK" || typed.status === "UNSET"
            ? typed.status
            : typed.checked === true
              ? "OK"
              : "UNSET",
        findingTitle: typeof typed.findingTitle === "string" ? typed.findingTitle : "",
        findingDescription: typeof typed.findingDescription === "string" ? typed.findingDescription : "",
        findingSeverity:
          typeof typed.findingSeverity === "number" && typed.findingSeverity >= 1 && typed.findingSeverity <= 5
            ? typed.findingSeverity
            : 3,
        findingLocation: typeof typed.findingLocation === "string" ? typed.findingLocation : "",
        findingImageKeys: Array.isArray(typed.findingImageKeys)
          ? typed.findingImageKeys.filter((value): value is string => typeof value === "string")
          : [],
        linkedFindingId: typeof typed.linkedFindingId === "string" ? typed.linkedFindingId : undefined,
      };
    })
    .filter((entry): entry is ChecklistEntry => entry !== null);
}

export function InspectionChecklist({ inspectionId, checklist }: InspectionChecklistProps) {
  const t = useTranslations("dashboardInspectionComponents.checklist");
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [entries, setEntries] = useState<ChecklistEntry[]>(() => normalizeChecklistEntries(checklist));
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  const progress = useMemo(() => {
    const checklistItems = entries.filter((entry): entry is Extract<ChecklistEntry, { type: "item" }> => entry.type === "item");
    const total = checklistItems.length;
    const completed = checklistItems.filter((item) => item.checked).length;
    return { total, completed };
  }, [entries]);

  const toggleItem = (index: number, checked: boolean) => {
    setEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index || entry.type !== "item") return entry;
        if (checked) {
          return { ...entry, checked: true, status: "OK" };
        }
        return { ...entry, checked: false, status: entry.status === "NOT_OK" ? "NOT_OK" : "UNSET" };
      })
    );
  };

  const setItemStatus = (index: number, status: "OK" | "NOT_OK") => {
    setEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index || entry.type !== "item") return entry;
        if (status === "OK") {
          return {
            ...entry,
            checked: true,
            status: "OK",
          };
        }
        return {
          ...entry,
          checked: false,
          status: "NOT_OK",
          findingTitle: entry.findingTitle || entry.title,
          findingSeverity: entry.findingSeverity || 3,
        };
      })
    );
  };

  const updateItemFindingField = (
    index: number,
    field: "findingTitle" | "findingDescription" | "findingLocation" | "findingSeverity",
    value: string | number
  ) => {
    setEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index || entry.type !== "item") return entry;
        return {
          ...entry,
          [field]: value,
        };
      })
    );
  };

  const uploadFindingImages = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setUploadingIndex(index);
    try {
      const uploadedKeys: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("inspectionId", inspectionId);

        const response = await fetch("/api/inspections/upload", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as {
          data?: { key?: string };
          message?: string;
        };
        if (!response.ok || !result.data?.key) {
          throw new Error(result.message || t("errors.uploadImage"));
        }
        uploadedKeys.push(result.data.key);
      }

      setEntries((previous) =>
        previous.map((entry, entryIndex) => {
          if (entryIndex !== index || entry.type !== "item") return entry;
          const existingImages = entry.findingImageKeys || [];
          return {
            ...entry,
            findingImageKeys: [...existingImages, ...uploadedKeys],
          };
        })
      );
    } catch {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: t("toasts.error.uploadImage"),
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeFindingImage = async (index: number, imageKey: string) => {
    try {
      await fetch("/api/inspections/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: imageKey }),
      });

      setEntries((previous) =>
        previous.map((entry, entryIndex) => {
          if (entryIndex !== index || entry.type !== "item") return entry;
          return {
            ...entry,
            findingImageKeys: (entry.findingImageKeys || []).filter((key) => key !== imageKey),
          };
        })
      );
    } catch {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: t("toasts.error.removeImage"),
      });
    }
  };

  const saveChecklist = async () => {
    setSaving(true);
    try {
      const entriesWithLinkedFindings = [...entries];
      let createdFindings = 0;

      for (let index = 0; index < entriesWithLinkedFindings.length; index += 1) {
        const entry = entriesWithLinkedFindings[index];
        if (entry.type !== "item" || entry.status !== "NOT_OK") {
          continue;
        }

        const findingTitle = (entry.findingTitle || entry.title).trim();
        const findingDescription = (entry.findingDescription || "").trim();
        if (findingDescription.length === 0) {
          throw new Error(t("errors.missingFindingDescription", { title: entry.title }));
        }

        if (!entry.linkedFindingId) {
          const findingResponse = await fetch(`/api/inspections/${inspectionId}/findings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: findingTitle,
              description: findingDescription,
              severity: entry.findingSeverity || 3,
              location: entry.findingLocation || null,
              imageKeys: entry.findingImageKeys || [],
            }),
          });
          const findingResult = (await findingResponse.json()) as {
            data?: { finding?: { id?: string } };
            message?: string;
          };
          if (!findingResponse.ok || !findingResult.data?.finding?.id) {
            throw new Error(findingResult.message || t("errors.createFindingFromCheckpoint"));
          }
          entriesWithLinkedFindings[index] = {
            ...entry,
            linkedFindingId: findingResult.data.finding.id,
          };
          createdFindings += 1;
        }
      }

      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: {
            items: entriesWithLinkedFindings,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || t("errors.saveChecklist"));
      }

      setEntries(entriesWithLinkedFindings);
      toast({
        title: t("toasts.saved.title"),
        description:
          createdFindings > 0
            ? t("toasts.saved.withFindings", { count: createdFindings })
            : t("toasts.saved.description"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.saveChecklistFallback");
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const result = await generateAiInspectionSummary({
        inspectionName: `Vernerunde ${inspectionId}`,
        checklistItems: entries
          .filter((entry): entry is Extract<ChecklistEntry, { type: "item" }> => entry.type === "item")
          .map((entry) => ({
            title: entry.title,
            status: entry.status || "UNSET",
            findingDescription: entry.findingDescription || "",
          })),
      });
      if (!result.success || !result.data) {
        toast({
          variant: "destructive",
          title: t("toasts.aiFailed.title"),
          description: result.error || t("toasts.aiFailed.description"),
        });
        return;
      }
      setAiSummary(result.data.summary);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("progress", { completed: progress.completed, total: progress.total })}
      </p>
      <div className="space-y-2 rounded border p-3">
        {entries.map((entry, index) =>
          entry.type === "heading" ? (
            <p key={`heading-${index}`} className="pt-2 text-sm font-semibold">
              {entry.title}
            </p>
          ) : (
            <div key={`item-${index}`} className="space-y-3 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <Checkbox checked={entry.status === "OK"} onCheckedChange={(value) => toggleItem(index, value === true)} />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{entry.title}</span>
                    {entry.status === "NOT_OK" && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
                        {t("badges.finding")}
                      </span>
                    )}
                    {entry.linkedFindingId && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                        {t("badges.findingRegistered")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={entry.status === "OK" ? "default" : "outline"}
                      onClick={() => setItemStatus(index, "OK")}
                    >
                      {t("actions.ok")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={entry.status === "NOT_OK" ? "destructive" : "outline"}
                      onClick={() => setItemStatus(index, "NOT_OK")}
                    >
                      {t("actions.notOk")}
                    </Button>
                  </div>
                </div>
              </div>

              {entry.status === "NOT_OK" && (
                <div className="space-y-3 rounded border bg-red-50/40 p-3">
                  <div className="space-y-2">
                    <Label>{t("fields.findingTitle")}</Label>
                    <Input
                      value={entry.findingTitle || ""}
                      onChange={(event) => updateItemFindingField(index, "findingTitle", event.target.value)}
                      placeholder={t("placeholders.findingTitle")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("fields.findingDescription")}</Label>
                    <Textarea
                      value={entry.findingDescription || ""}
                      onChange={(event) => updateItemFindingField(index, "findingDescription", event.target.value)}
                      placeholder={t("placeholders.findingDescription")}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("fields.severity")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={entry.findingSeverity || 3}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          if (!Number.isFinite(nextValue)) return;
                          updateItemFindingField(index, "findingSeverity", Math.max(1, Math.min(5, nextValue)));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("fields.location")}</Label>
                      <Input
                        value={entry.findingLocation || ""}
                        onChange={(event) => updateItemFindingField(index, "findingLocation", event.target.value)}
                        placeholder={t("placeholders.location")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("fields.images")}</Label>
                    <div className="rounded border border-dashed bg-background p-3">
                      <input
                        type="file"
                        id={`finding-image-${index}`}
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => uploadFindingImages(index, event.target.files)}
                        disabled={uploadingIndex === index}
                      />
                      <label
                        htmlFor={`finding-image-${index}`}
                        className="flex cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground"
                      >
                        <Camera className="h-4 w-4" />
                        {uploadingIndex === index ? t("actions.uploading") : t("actions.addImage")}
                      </label>
                    </div>
                    {(entry.findingImageKeys || []).length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {(entry.findingImageKeys || []).map((imageKey) => (
                          <div key={imageKey} className="relative">
                            <img
                              src={`/api/inspections/images/${imageKey}`}
                              alt={t("imageAlt")}
                              className="h-20 w-full rounded border object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white"
                              onClick={() => removeFindingImage(index, imageKey)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={saveChecklist} disabled={saving}>
          {saving ? t("actions.saving") : t("actions.saveChecklist")}
        </Button>
      </div>
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          {t("ai.title")}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
          {isGeneratingSummary ? t("ai.generating") : t("ai.generate")}
        </Button>
        <Textarea
          value={aiSummary}
          onChange={(event) => setAiSummary(event.target.value)}
          placeholder={t("ai.placeholder")}
          rows={4}
        />
      </div>
    </div>
  );
}
