'use client';

import { useEffect, useMemo, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createRisk, updateRisk } from "@/server/actions/risk.actions";
import { calculateRiskScore } from "@/features/risks/schemas/risk.schema";
import { useToast } from "@/hooks/use-toast";
import type {
  ControlFrequency,
  Risk,
  RiskCategory,
  RiskResponseStrategy,
  RiskTrend,
} from "@prisma/client";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

interface RiskFormProps {
  tenantId: string;
  userId: string;
  risk?: Risk;
  mode?: "create" | "edit";
  owners: Array<{ id: string; name?: string | null; email?: string | null }>;
  goalOptions?: Array<{ id: string; title: string }>;
  templateOptions?: Array<{ id: string; name: string }>;
  /** Kort som vises mellom Risikonivå og Rest-risiko (f.eks. Tiltak for å redusere risiko). Kun i edit-mode. */
  slotBetweenRisikonivaAndResidual?: React.ReactNode;
}

// ISO 45001/31000 – status for risikovurdering
const statusOptions = [
  { value: "OPEN", labelKey: "status.OPEN" },
  { value: "MITIGATING", labelKey: "status.MITIGATING" },
  { value: "ACCEPTED", labelKey: "status.ACCEPTED" },
  { value: "CLOSED", labelKey: "status.CLOSED" },
];

const categoryOptions: Array<{ value: RiskCategory; labelKey: string }> = [
  { value: "OPERATIONAL", labelKey: "categories.OPERATIONAL" },
  { value: "SAFETY", labelKey: "categories.SAFETY" },
  { value: "HEALTH", labelKey: "categories.HEALTH" },
  { value: "ENVIRONMENTAL", labelKey: "categories.ENVIRONMENTAL" },
  { value: "INFORMATION_SECURITY", labelKey: "categories.INFORMATION_SECURITY" },
  { value: "LEGAL", labelKey: "categories.LEGAL" },
  { value: "STRATEGIC", labelKey: "categories.STRATEGIC" },
  { value: "PSYCHOSOCIAL", labelKey: "categories.PSYCHOSOCIAL" },
  { value: "ERGONOMIC", labelKey: "categories.ERGONOMIC" },
  { value: "ORGANISATIONAL", labelKey: "categories.ORGANISATIONAL" },
  { value: "PHYSICAL", labelKey: "categories.PHYSICAL" },
];

const frequencyOptions: Array<{ value: ControlFrequency; labelKey: string }> = [
  { value: "WEEKLY", labelKey: "frequency.WEEKLY" },
  { value: "MONTHLY", labelKey: "frequency.MONTHLY" },
  { value: "QUARTERLY", labelKey: "frequency.QUARTERLY" },
  { value: "ANNUAL", labelKey: "frequency.ANNUAL" },
  { value: "BIENNIAL", labelKey: "frequency.BIENNIAL" },
];

const responseOptions: Array<{ value: RiskResponseStrategy; labelKey: string; descriptionKey: string }> = [
  {
    value: "AVOID",
    labelKey: "response.AVOID.label",
    descriptionKey: "response.AVOID.description",
  },
  {
    value: "REDUCE",
    labelKey: "response.REDUCE.label",
    descriptionKey: "response.REDUCE.description",
  },
  {
    value: "TRANSFER",
    labelKey: "response.TRANSFER.label",
    descriptionKey: "response.TRANSFER.description",
  },
  {
    value: "ACCEPT",
    labelKey: "response.ACCEPT.label",
    descriptionKey: "response.ACCEPT.description",
  },
];

const trendOptions: Array<{ value: RiskTrend; labelKey: string }> = [
  { value: "INCREASING", labelKey: "trend.INCREASING" },
  { value: "STABLE", labelKey: "trend.STABLE" },
  { value: "DECREASING", labelKey: "trend.DECREASING" },
];

const NO_GOAL_VALUE = "__none_goal__";
const NO_TEMPLATE_VALUE = "__none_template__";

const formatDateInput = (value?: Date | string | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getDefaultNextReview = (frequency: ControlFrequency) => {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MONTHLY":
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    case "QUARTERLY":
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    case "ANNUAL":
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    case "BIENNIAL":
      return new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
};

export function RiskForm({
  tenantId,
  userId,
  risk,
  mode = "create",
  owners,
  goalOptions = [],
  templateOptions = [],
  slotBetweenRisikonivaAndResidual,
}: RiskFormProps) {
  const t = useTranslations("riskForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [likelihood, setLikelihood] = useState(risk?.likelihood || 3);
  const [consequence, setConsequence] = useState(risk?.consequence || 3);
  const [ownerId, setOwnerId] = useState(risk?.ownerId || userId);
  const [category, setCategory] = useState<RiskCategory>(risk?.category || "OPERATIONAL");
  const [controlFrequency, setControlFrequency] = useState<ControlFrequency>(
    risk?.controlFrequency || "ANNUAL"
  );
  const [nextReviewTouched, setNextReviewTouched] = useState(Boolean(risk?.nextReviewDate));
  const [nextReviewDate, setNextReviewDate] = useState(
    formatDateInput(risk?.nextReviewDate ?? getDefaultNextReview(controlFrequency))
  );
  const [residualLikelihood, setResidualLikelihood] = useState<number | null>(
    risk?.residualLikelihood ?? null
  );
  const [residualConsequence, setResidualConsequence] = useState<number | null>(
    risk?.residualConsequence ?? null
  );
  const [selectedGoal, setSelectedGoal] = useState(risk?.kpiId ?? NO_GOAL_VALUE);
  const [selectedTemplate, setSelectedTemplate] = useState(
    risk?.inspectionTemplateId ?? NO_TEMPLATE_VALUE
  );
  const [riskAppetite, setRiskAppetite] = useState(risk?.riskAppetite ?? "");
  const [riskTolerance, setRiskTolerance] = useState(risk?.riskTolerance ?? "");
  const [responseStrategy, setResponseStrategy] = useState<RiskResponseStrategy>(
    risk?.responseStrategy ?? "REDUCE"
  );
  const [trend, setTrend] = useState<RiskTrend>(risk?.trend ?? "STABLE");
  const [reviewedAt, setReviewedAt] = useState(formatDateInput(risk?.reviewedAt));

  useEffect(() => {
    if (!nextReviewTouched) {
      const updated = getDefaultNextReview(controlFrequency);
      setNextReviewDate(formatDateInput(updated));
    }
  }, [controlFrequency, nextReviewTouched]);

  const { score, level, color, bgColor } = calculateRiskScore(likelihood, consequence);

  const residualScore = useMemo(() => {
    if (!residualLikelihood || !residualConsequence) return null;
    return calculateRiskScore(residualLikelihood, residualConsequence);
  }, [residualLikelihood, residualConsequence]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      title: formData.get("title") as string,
      context: formData.get("context") as string,
      likelihood,
      consequence,
      ownerId,
      status: (formData.get("status") as string) || "OPEN",
      category,
      location: formData.get("location") as string,
      area: formData.get("area") as string,
      description: formData.get("description") as string,
      existingControls: formData.get("existingControls") as string,
      controlFrequency,
      nextReviewDate: nextReviewDate || undefined,
      riskStatement: formData.get("riskStatement") as string,
      residualLikelihood,
      residualConsequence,
      kpiId: selectedGoal === NO_GOAL_VALUE ? undefined : selectedGoal,
      inspectionTemplateId: selectedTemplate === NO_TEMPLATE_VALUE ? undefined : selectedTemplate,
      linkedProcess: formData.get("linkedProcess") as string,
      riskAppetite,
      riskTolerance,
      responseStrategy,
      trend,
      reviewedAt: reviewedAt || undefined,
    };

    try {
      const result =
        mode === "create"
          ? await createRisk({ ...payload, tenantId })
          : await updateRisk({ ...payload, id: risk!.id });

      if (result.success) {
        toast({
          title:
            mode === "create"
              ? t("toasts.createSuccess.title")
              : t("toasts.updateSuccess.title"),
          description: t("toasts.successDescription", { level, score }),
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/risks");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: t("toasts.error.title"),
          description: result.error || t("toasts.error.saveRisk"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toasts.unexpectedError.title"),
        description: t("toasts.unexpectedError.description"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.basic.title")}</CardTitle>
          <CardDescription>
            {t("sections.basic.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t("fields.title.label")}</Label>
              <Input
                id="title"
                name="title"
                placeholder={t("fields.title.placeholder")}
                defaultValue={risk?.title}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t("fields.category.label")}</Label>
              <Select value={category} onValueChange={(val: RiskCategory) => setCategory(val)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.category.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerId">{t("fields.owner.label")}</Label>
              <Select value={ownerId} onValueChange={setOwnerId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.owner.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name || owner.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t("fields.status.label")}</Label>
              <Select name="status" defaultValue={risk?.status || "OPEN"} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.status.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">{t("fields.location.label")}</Label>
              <Input
                id="location"
                name="location"
                placeholder={t("fields.location.placeholder")}
                defaultValue={risk?.location ?? ""}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">{t("fields.area.label")}</Label>
              <Input
                id="area"
                name="area"
                placeholder={t("fields.area.placeholder")}
                defaultValue={risk?.area ?? ""}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sections.description.title")}</CardTitle>
          <CardDescription>
            {t("sections.description.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="context">{t("fields.context.label")}</Label>
            <Textarea
              id="context"
              name="context"
              placeholder={t("fields.context.placeholder")}
              defaultValue={risk?.context}
              required
              disabled={loading}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="riskStatement">{t("fields.riskStatement.label")}</Label>
            <Textarea
              id="riskStatement"
              name="riskStatement"
              placeholder={t("fields.riskStatement.placeholder")}
              defaultValue={risk?.riskStatement ?? ""}
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="existingControls">{t("fields.existingControls.label")}</Label>
            <Textarea
              id="existingControls"
              name="existingControls"
              placeholder={t("fields.existingControls.placeholder")}
              defaultValue={risk?.existingControls ?? ""}
              disabled={loading}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("fields.description.label")}</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={t("fields.description.placeholder")}
              defaultValue={risk?.description ?? ""}
              disabled={loading}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("sections.riskLevel.title")}</CardTitle>
            {(level === "MEDIUM" || level === "HIGH" || level === "CRITICAL") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    title={t("sections.riskLevel.tipsButtonTitle")}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-w-sm p-4"
                  sideOffset={8}
                >
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    {t("sections.riskLevel.tipsTitle", {
                      level:
                        level === "CRITICAL"
                          ? t("sections.riskLevel.levels.critical")
                          : level === "HIGH"
                            ? t("sections.riskLevel.levels.high")
                            : t("sections.riskLevel.levels.medium"),
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mode === "edit"
                      ? t("sections.riskLevel.tipsEdit")
                      : t("sections.riskLevel.tipsCreate")}
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CardDescription>
            {risk?.riskAssessmentId
              ? t("sections.riskLevel.descriptionReadOnly")
              : t("sections.riskLevel.descriptionEditable")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {risk?.riskAssessmentId ? (
            <div className={`rounded-lg border-2 p-4 ${bgColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xl font-bold ${color}`}>{level}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                      {t("sections.riskLevel.scoreEquation", { likelihood, consequence, score })}
                  </div>
                </div>
                <div className={`text-4xl font-bold ${color}`}>{score}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("sections.riskLevel.likelihoodLabel")}</Label>
                  <Select
                    value={String(likelihood)}
                    onValueChange={(v) => setLikelihood(Number(v))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("sections.riskLevel.consequenceLabel")}</Label>
                  <Select
                    value={String(consequence)}
                    onValueChange={(v) => setConsequence(Number(v))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={`rounded-lg border-2 p-4 ${bgColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xl font-bold ${color}`}>{level}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t("sections.riskLevel.scoreEquation", { likelihood, consequence, score })}
                    </div>
                  </div>
                  <div className={`text-4xl font-bold ${color}`}>{score}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {mode === "edit" && slotBetweenRisikonivaAndResidual}

      <Card>
        <CardHeader>
          <CardTitle>{t("sections.residual.title")}</CardTitle>
          <CardDescription>
            {t("sections.residual.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{t("sections.residual.likelihoodLabel")}</Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[residualLikelihood ?? 3]}
                onValueChange={([value]) => setResidualLikelihood(value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {residualLikelihood
                  ? t("sections.residual.value", { value: residualLikelihood })
                  : t("sections.residual.selectValue")}
              </p>
            </div>
            <div>
              <Label>{t("sections.residual.consequenceLabel")}</Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[residualConsequence ?? 3]}
                onValueChange={([value]) => setResidualConsequence(value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {residualConsequence
                  ? t("sections.residual.value", { value: residualConsequence })
                  : t("sections.residual.selectValue")}
              </p>
            </div>
          </div>
          {residualScore && (
            <div className={`p-4 rounded-lg border ${residualScore.bgColor}`}>
              <p className={`font-semibold ${residualScore.color}`}>
                {t("sections.residual.level", {
                  level: residualScore.level,
                  score: residualScore.score,
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sections.followUp.title")}</CardTitle>
          <CardDescription>
            {t("sections.followUp.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="controlFrequency">{t("fields.controlFrequency.label")}</Label>
              <Select
                value={controlFrequency}
                onValueChange={(value: ControlFrequency) => setControlFrequency(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.controlFrequency.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">{t("fields.nextReviewDate.label")}</Label>
              <Input
                id="nextReviewDate"
                name="nextReviewDate"
                type="date"
                value={nextReviewDate}
                onChange={(event) => {
                  setNextReviewTouched(true);
                  setNextReviewDate(event.target.value);
                }}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("fields.responseStrategy.label")}</Label>
              <Select
                value={responseStrategy}
                onValueChange={(value: RiskResponseStrategy) => setResponseStrategy(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("fields.responseStrategy.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {responseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <p className="font-medium">{t(option.labelKey)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(option.descriptionKey)}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avansert: ISO 31000-spesifikke felter – kun nødvendig for virksomhetsrisiko */}
      <AdvancedSection
        goalOptions={goalOptions}
        templateOptions={templateOptions}
        selectedGoal={selectedGoal}
        setSelectedGoal={setSelectedGoal}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        linkedProcess={risk?.linkedProcess ?? ""}
        riskAppetite={riskAppetite}
        setRiskAppetite={setRiskAppetite}
        riskTolerance={riskTolerance}
        setRiskTolerance={setRiskTolerance}
        trend={trend}
        setTrend={setTrend}
        reviewedAt={reviewedAt}
        setReviewedAt={setReviewedAt}
        loading={loading}
      />

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? t("actions.saving")
            : mode === "create"
              ? t("actions.create")
              : t("actions.saveChanges")}
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

interface AdvancedSectionProps {
  goalOptions: Array<{ id: string; title: string }>;
  templateOptions: Array<{ id: string; name: string }>;
  selectedGoal: string;
  setSelectedGoal: (v: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (v: string) => void;
  linkedProcess: string;
  riskAppetite: string;
  setRiskAppetite: (v: string) => void;
  riskTolerance: string;
  setRiskTolerance: (v: string) => void;
  trend: RiskTrend;
  setTrend: (v: RiskTrend) => void;
  reviewedAt: string;
  setReviewedAt: (v: string) => void;
  loading: boolean;
}

function AdvancedSection({
  goalOptions,
  templateOptions,
  selectedGoal,
  setSelectedGoal,
  selectedTemplate,
  setSelectedTemplate,
  linkedProcess,
  riskAppetite,
  setRiskAppetite,
  riskTolerance,
  setRiskTolerance,
  trend,
  setTrend,
  reviewedAt,
  setReviewedAt,
  loading,
}: AdvancedSectionProps) {
  const t = useTranslations("riskForm");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div>
          <p className="font-medium text-sm">{t("advanced.title")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("advanced.description")}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="linkedProcess">{t("advanced.fields.linkedProcess.label")}</Label>
              <Input
                id="linkedProcess"
                name="linkedProcess"
                placeholder={t("advanced.fields.linkedProcess.placeholder")}
                defaultValue={linkedProcess}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpiId">{t("advanced.fields.goal.label")}</Label>
              <Select
                value={selectedGoal}
                onValueChange={setSelectedGoal}
                disabled={goalOptions.length === 0 || loading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      goalOptions.length
                        ? t("advanced.fields.goal.placeholder")
                        : t("advanced.fields.goal.noneAvailable")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GOAL_VALUE}>{t("advanced.fields.goal.noneOption")}</SelectItem>
                  {goalOptions.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionTemplateId">{t("advanced.fields.template.label")}</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={templateOptions.length === 0 || loading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      templateOptions.length
                        ? t("advanced.fields.template.placeholder")
                        : t("advanced.fields.template.noneAvailable")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE_VALUE}>
                    {t("advanced.fields.template.noneOption")}
                  </SelectItem>
                  {templateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="riskAppetite">{t("advanced.fields.riskAppetite.label")}</Label>
              <Textarea
                id="riskAppetite"
                name="riskAppetite"
                placeholder={t("advanced.fields.riskAppetite.placeholder")}
                value={riskAppetite}
                onChange={(e) => setRiskAppetite(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskTolerance">{t("advanced.fields.riskTolerance.label")}</Label>
              <Textarea
                id="riskTolerance"
                name="riskTolerance"
                placeholder={t("advanced.fields.riskTolerance.placeholder")}
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("advanced.fields.trend.label")}</Label>
              <Select value={trend} onValueChange={(value: RiskTrend) => setTrend(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("advanced.fields.trend.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {trendOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewedAt">{t("advanced.fields.reviewedAt.label")}</Label>
              <Input
                id="reviewedAt"
                name="reviewedAt"
                type="date"
                value={reviewedAt}
                onChange={(e) => setReviewedAt(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}