"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import type { AnnualPlanProgress } from "@/server/actions/hms-handbok.actions";

interface HandbokAnnualPlanProps {
  progress: AnnualPlanProgress;
}

export function HandbokAnnualPlan({ progress }: HandbokAnnualPlanProps) {
  const percent =
    progress.totalSteps > 0
      ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
      : 0;

  const byCategory = new Map<string, typeof progress.steps>();
  for (const step of progress.steps) {
    const list = byCategory.get(step.category) ?? [];
    list.push(step);
    byCategory.set(step.category, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            Årshjul {progress.year} — Fremdrift
          </p>
          <p className="text-xs text-muted-foreground">
            {progress.completedSteps} av {progress.totalSteps} aktiviteter
            fullført
          </p>
        </div>
        <Badge
          variant={percent === 100 ? "default" : "secondary"}
          className={percent === 100 ? "bg-green-600" : ""}
        >
          {percent} %
        </Badge>
      </div>

      <Progress value={percent} className="h-2" />

      <div className="space-y-3">
        {Array.from(byCategory.entries()).map(([category, steps]) => {
          const catCompleted = steps.filter((s) => s.completed).length;
          return (
            <div key={category}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}{" "}
                <span className="font-normal">
                  ({catCompleted}/{steps.length})
                </span>
              </p>
              <div className="space-y-1">
                {steps.map((step) => (
                  <div
                    key={step.key}
                    className="flex items-start gap-2 rounded px-2 py-1 text-sm"
                  >
                    {step.completed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={
                        step.completed ? "text-muted-foreground line-through" : ""
                      }
                    >
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
