"use client";

import { useCallback, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getCategoryLabel,
  getCategoryOrder,
  type AnnualHmsPlanStep,
} from "@/lib/annual-hms-plan-steps";
import {
  setAnnualPlanStepDisposition,
  type AnnualPlanChecklistDataSerialized,
  type AnnualPlanStepStatus,
} from "@/server/actions/annual-hms-plan.actions";

type StepWithCompletion = AnnualPlanChecklistDataSerialized["steps"][number];

function groupByCategory(steps: StepWithCompletion[]): Map<AnnualHmsPlanStep["category"], StepWithCompletion[]> {
  const map = new Map<AnnualHmsPlanStep["category"], StepWithCompletion[]>();
  const order = getCategoryOrder();
  for (const cat of order) {
    map.set(cat, []);
  }
  for (const step of steps) {
    const list = map.get(step.category) ?? [];
    list.push(step);
    map.set(step.category, list);
  }
  return map;
}

interface AnnualPlanChecklistProps {
  initialData: AnnualPlanChecklistDataSerialized;
  tenantId: string;
  userId: string | null;
  canEdit: boolean;
}

export function AnnualPlanChecklist({
  initialData,
  tenantId,
  userId,
  canEdit,
}: AnnualPlanChecklistProps) {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, AnnualPlanStepStatus | null>>(() => {
    const next: Record<string, AnnualPlanStepStatus | null> = {};
    for (const step of initialData.steps) {
      next[step.key] = step.status ?? (step.completedAt != null ? "COMPLETED" : null);
    }
    return next;
  });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const byCategory = useMemo(
    () => groupByCategory(initialData.steps),
    [initialData.steps]
  );

  const completedCount = useMemo(
    () => Object.values(statuses).filter((status) => status === "COMPLETED").length,
    [statuses]
  );
  const settledCount = useMemo(
    () => Object.values(statuses).filter((status) => status !== null).length,
    [statuses]
  );
  const totalCount = initialData.totalCount;
  const openCount = Math.max(totalCount - settledCount, 0);
  const progressPercent = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;

  const setStatus = useCallback(
    async (stepKey: string, nextStatus: AnnualPlanStepStatus | null) => {
      if (!canEdit) return;
      const previous = statuses[stepKey] ?? null;
      setLoadingKey(stepKey);
      setStatuses((current) => ({ ...current, [stepKey]: nextStatus }));
      const result = await setAnnualPlanStepDisposition({
        tenantId,
        year: initialData.year,
        stepKey,
        status: nextStatus,
        userId: userId ?? undefined,
      });
      setLoadingKey(null);
      if (!result.success) {
        setStatuses((current) => ({ ...current, [stepKey]: previous }));
        toast({
          title: "Feil",
          description: "error" in result ? result.error : "Kunne ikke oppdatere",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      toast({
        title: nextStatus === "COMPLETED"
          ? "Punkt gjennomført"
          : nextStatus === "NOT_RELEVANT"
            ? "Markert som ikke relevant"
            : nextStatus === "NOT_USED"
              ? "Markert som ikke i bruk"
              : "Punktet er åpent igjen",
        duration: 3000,
      });
    },
    [canEdit, statuses, tenantId, initialData.year, userId, toast]
  );

  return (
    <div className="space-y-6">
      {/* Fremdrift */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Fremdrift for {initialData.year}</CardTitle>
            <CardDescription>
              Nummeret viser rekkefølgen etter hva som bør tas først i året. Alt skal være avklart innen 31.12.{initialData.year}, slik at ledelsesgjennomgangen har grunnlag for året (IK-HMS § 5, ISO 45001 kap. 9.3).
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/dashboard/annual-hms-plan/report?year=${initialData.year}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Åpne rapport for utskrift
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/api/annual-hms-plan/report/${initialData.year}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Last ned PDF (Adobe)
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Progress value={progressPercent} className="h-3 flex-1" />
            <span className="text-sm font-medium tabular-nums text-muted-foreground shrink-0">
              {settledCount} av {totalCount} avklart
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} gjennomført. {openCount} punkt{openCount === 1 ? "" : "er"} er fortsatt åpne og skal avklares innen årsslutt. Kryss av, eller marker som ikke relevant eller at det ikke brukes.
          </p>
          {openCount === 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                Årshjulet for {initialData.year} er avklart. {completedCount} punkt er gjennomført, resten er markert som ikke relevant eller ikke i bruk.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sjekkliste gruppert etter kategori */}
      <div className="space-y-8">
        {getCategoryOrder().map((category) => {
          const steps = byCategory.get(category);
          if (!steps || steps.length === 0) return null;
          const ordered = [...steps].sort((a, b) => a.order - b.order);
          const label = getCategoryLabel(category);
          const settledInGroup = ordered.filter((step) => statuses[step.key] != null).length;
          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>
                  {settledInGroup} av {ordered.length} avklart i denne gruppen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ordered.map((step) => {
                  const status = statuses[step.key] ?? null;
                  const loading = loadingKey === step.key;
                  return (
                    <div
                      key={step.key}
                      className={`flex gap-4 rounded-lg border p-4 transition-colors ${
                        status === "COMPLETED"
                          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                          : status
                            ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20"
                            : "bg-card"
                      }`}
                    >
                      <div className="flex shrink-0 items-start gap-2 pt-0.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                          {step.order}
                        </span>
                        <Checkbox
                          id={step.key}
                          checked={status === "COMPLETED"}
                          disabled={!canEdit || loading}
                          onCheckedChange={(checked) =>
                            void setStatus(step.key, checked === true ? "COMPLETED" : null)
                          }
                          className="h-5 w-5"
                        />
                        {loading && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <label
                          htmlFor={step.key}
                          className="font-medium cursor-pointer leading-tight"
                        >
                          {step.title}
                        </label>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.legalRef && (
                          <p className="text-xs text-muted-foreground">Krav: {step.legalRef}</p>
                        )}
                        {status === "NOT_RELEVANT" && (
                          <p className="text-xs text-muted-foreground">Markert som ikke relevant for virksomheten.</p>
                        )}
                        {status === "NOT_USED" && (
                          <p className="text-xs text-muted-foreground">Markert som ikke i bruk.</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={status === "NOT_RELEVANT" ? "secondary" : "outline"}
                            className="bg-transparent"
                            disabled={!canEdit || loading}
                            onClick={() =>
                              void setStatus(step.key, status === "NOT_RELEVANT" ? null : "NOT_RELEVANT")
                            }
                          >
                            Ikke relevant
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={status === "NOT_USED" ? "secondary" : "outline"}
                            className="bg-transparent"
                            disabled={!canEdit || loading}
                            onClick={() =>
                              void setStatus(step.key, status === "NOT_USED" ? null : "NOT_USED")
                            }
                          >
                            Brukes ikke
                          </Button>
                        </div>
                      </div>
                      {step.href && (
                        <Button asChild variant="ghost" size="sm" className="shrink-0">
                          <Link href={step.href} target="_blank" rel="noopener noreferrer">
                            Gå til modul
                            <ExternalLink className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
