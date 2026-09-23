"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useRefreshAfterSave } from "@/hooks/use-refresh-after-save";
import { useToast } from "@/hooks/use-toast";
import { approveAiRiskMeasures, previewAiRiskMeasures } from "@/server/actions/ai-risk-measures.actions";

const MEASURE_CATEGORIES = ["CORRECTIVE", "PREVENTIVE", "IMPROVEMENT", "MITIGATION"] as const;
type MeasureCategoryValue = (typeof MEASURE_CATEGORIES)[number];

const CONTROL_FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "BIENNIAL"] as const;
type ControlFrequencyValue = (typeof CONTROL_FREQUENCIES)[number];

interface DraftRow {
  id: string;
  sourceTitle: string;
  title: string;
  description: string;
  category: MeasureCategoryValue;
  followUpFrequency: ControlFrequencyValue;
  rationale: string;
  suggestedDueDays: number;
}

function dueDateFromDays(days: number): string {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.round(days)) : 0;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + safeDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isDuplicateMeasureTitle(title: string, existingTitles: readonly string[]): boolean {
  const key = title.trim().toLowerCase();
  if (!key) return false;
  return existingTitles.some((existing) => existing.trim().toLowerCase() === key);
}

function residualLevelKey(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 20) return "critical";
  if (score >= 12) return "high";
  if (score >= 6) return "medium";
  return "low";
}

function residualClassName(score: number): string {
  if (score >= 20) return "border-red-300 bg-red-100 text-red-900";
  if (score >= 12) return "border-orange-300 bg-orange-100 text-orange-900";
  if (score >= 6) return "border-yellow-300 bg-yellow-100 text-yellow-900";
  return "border-green-300 bg-green-100 text-green-900";
}

interface AiRiskMeasureSuggestionsProps {
  riskId: string;
  riskTitle: string;
  ownerId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  enabled: boolean;
}

export function AiRiskMeasureSuggestions(props: AiRiskMeasureSuggestionsProps) {
  if (!props.enabled) return null;
  return <AiRiskMeasureSuggestionsDialog {...props} />;
}

function AiRiskMeasureSuggestionsDialog({
  riskId,
  riskTitle,
  ownerId,
  users,
}: AiRiskMeasureSuggestionsProps) {
  const t = useTranslations("dashboardRiskDetailPage.measures.ai");
  const refreshAfterSave = useRefreshAfterSave();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [responsibleId, setResponsibleId] = useState(users.some((user) => user.id === ownerId) ? ownerId : "");
  const [dueAt, setDueAt] = useState(dueDateFromDays(30));
  const [dueTouched, setDueTouched] = useState(false);
  const [currentLikelihood, setCurrentLikelihood] = useState(1);
  const [currentConsequence, setCurrentConsequence] = useState(1);
  const [residualLikelihood, setResidualLikelihood] = useState(1);
  const [residualConsequence, setResidualConsequence] = useState(1);
  const [residualRationale, setResidualRationale] = useState("");
  const [originalResidualLikelihood, setOriginalResidualLikelihood] = useState(1);
  const [originalResidualConsequence, setOriginalResidualConsequence] = useState(1);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await previewAiRiskMeasures(riskId);
      if (!result.success) {
        setDrafts([]);
        setError(result.error || t("loadError"));
        return;
      }

      const rows: DraftRow[] = result.data.measures.map((measure) => ({
        ...measure,
        id: crypto.randomUUID(),
        sourceTitle: measure.title,
      }));
      const titles = result.data.existingTitles;
      setDrafts(rows);
      setExistingTitles(titles);
      setSelectedIds(
        new Set(rows.filter((row) => !isDuplicateMeasureTitle(row.title, titles)).map((row) => row.id)),
      );
      if (!dueTouched) {
        const days = rows
          .filter((row) => !isDuplicateMeasureTitle(row.title, titles))
          .map((row) => row.suggestedDueDays);
        const suggested = days.length > 0 ? Math.max(...days) : 30;
        setDueAt(dueDateFromDays(suggested));
      }
      setCurrentLikelihood(result.data.currentLikelihood);
      setCurrentConsequence(result.data.currentConsequence);
      setResidualLikelihood(result.data.residual.likelihood);
      setResidualConsequence(result.data.residual.consequence);
      setResidualRationale(result.data.residual.rationale);
      setOriginalResidualLikelihood(result.data.residual.likelihood);
      setOriginalResidualConsequence(result.data.residual.consequence);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && drafts.length === 0 && !loading) {
      void loadSuggestions();
    }
  };

  const updateDraft = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleApprove = async () => {
    const selected = drafts.filter((row) => selectedIds.has(row.id));
    const payload = selected
      .filter((row) => !isDuplicateMeasureTitle(row.title, existingTitles))
      .map((row) => ({
        title: row.title.trim(),
        description: row.description.trim(),
        category: row.category,
        followUpFrequency: row.followUpFrequency,
        originalTitle: row.sourceTitle,
      }));

    if (!responsibleId) {
      toast({ variant: "destructive", title: t("responsibleRequired") });
      return;
    }
    if (payload.length === 0) {
      toast({ variant: "destructive", title: t("noneSelected") });
      return;
    }

    setApproving(true);
    try {
      const result = await approveAiRiskMeasures({
        riskId,
        responsibleId,
        dueAt,
        measures: payload,
        residualLikelihood,
        residualConsequence,
        originalResidualLikelihood,
        originalResidualConsequence,
      });
      if (!result.success) {
        toast({
          variant: "destructive",
          title: t("saveError"),
          description: result.error,
        });
        return;
      }

      toast({
        title: t("savedTitle"),
        description: t("savedDescription", {
          count: result.data.created,
          likelihood: residualLikelihood,
          consequence: residualConsequence,
        }),
      });
      setOpen(false);
      setDrafts([]);
      setSelectedIds(new Set());
      await refreshAfterSave();
    } finally {
      setApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("dialogDescription", { risk: riskTitle })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadSuggestions()}>
              {t("retry")}
            </Button>
          </div>
        ) : null}

        {!loading && !error && drafts.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("legalNote")}</p>
            <div className="space-y-3">
              {drafts.map((row) => {
                const duplicate = isDuplicateMeasureTitle(row.title, existingTitles);
                return (
                  <div key={row.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`ai-measure-${row.id}`}
                        checked={selectedIds.has(row.id) && !duplicate}
                        onCheckedChange={(value) => toggleSelected(row.id, value === true)}
                        disabled={approving || duplicate}
                        className="mt-2"
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor={`ai-measure-title-${row.id}`}>{t("title")}</Label>
                          <Input
                            id={`ai-measure-title-${row.id}`}
                            value={row.title}
                            maxLength={200}
                            disabled={approving}
                            onChange={(event) => updateDraft(row.id, { title: event.target.value })}
                          />
                        </div>
                        {duplicate ? <p className="text-xs text-muted-foreground">{t("duplicate")}</p> : null}
                        <div className="space-y-1">
                          <Label htmlFor={`ai-measure-description-${row.id}`}>{t("description")}</Label>
                          <Textarea
                            id={`ai-measure-description-${row.id}`}
                            value={row.description}
                            rows={3}
                            maxLength={2000}
                            disabled={approving}
                            onChange={(event) => updateDraft(row.id, { description: event.target.value })}
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>{t("category")}</Label>
                            <Select
                              value={row.category}
                              disabled={approving}
                              onValueChange={(value: MeasureCategoryValue) => updateDraft(row.id, { category: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MEASURE_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {t(`categories.${category}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>{t("frequency")}</Label>
                            <Select
                              value={row.followUpFrequency}
                              disabled={approving}
                              onValueChange={(value: ControlFrequencyValue) =>
                                updateDraft(row.id, { followUpFrequency: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTROL_FREQUENCIES.map((frequency) => (
                                  <SelectItem key={frequency} value={frequency}>
                                    {t(`frequencies.${frequency}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {row.rationale ? (
                          <p className="text-xs text-muted-foreground">
                            {t("rationale")}: {row.rationale}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {t("suggestedDue", { days: row.suggestedDueDays })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{t("residualTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("residualHint")}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("residualBefore", {
                  likelihood: currentLikelihood,
                  consequence: currentConsequence,
                  score: currentLikelihood * currentConsequence,
                })}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("residualLikelihood")}</Label>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[residualLikelihood]}
                    disabled={approving}
                    onValueChange={([value]) => {
                      if (value) setResidualLikelihood(value);
                    }}
                  />
                  <p className="text-sm text-muted-foreground">{residualLikelihood}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t("residualConsequence")}</Label>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[residualConsequence]}
                    disabled={approving}
                    onValueChange={([value]) => {
                      if (value) setResidualConsequence(value);
                    }}
                  />
                  <p className="text-sm text-muted-foreground">{residualConsequence}</p>
                </div>
              </div>
              {residualRationale ? (
                <p className="text-xs text-muted-foreground">
                  {t("rationale")}: {residualRationale}
                </p>
              ) : null}
              <div className={`rounded-md border p-3 text-sm font-medium ${residualClassName(residualLikelihood * residualConsequence)}`}>
                {t("residualAfter", {
                  level: t(`levels.${residualLevelKey(residualLikelihood * residualConsequence)}`),
                  score: residualLikelihood * residualConsequence,
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("responsible")}</Label>
                <Select
                  value={responsibleId || undefined}
                  disabled={approving}
                  onValueChange={setResponsibleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectResponsible")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ai-measure-due">{t("dueAt")}</Label>
                <Input
                  id="ai-measure-due"
                  type="date"
                  value={dueAt}
                  min={dueDateFromDays(0)}
                  disabled={approving}
                  onChange={(event) => {
                    setDueTouched(true);
                    setDueAt(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={approving || loading} onClick={() => void loadSuggestions()}>
                {t("retry")}
              </Button>
              <Button type="button" disabled={approving} onClick={() => void handleApprove()}>
                {approving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("approving")}
                  </>
                ) : (
                  t("approve")
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
