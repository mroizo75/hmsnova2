"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Network,
  BookOpen,
  ShieldAlert,
  PenLine,
  CheckCircle2,
  Circle,
  ArrowRight,
  EyeOff,
  Loader2,
  Trophy,
  ClipboardCheck,
  FileCheck,
  AlertTriangle,
  Bell,
  Flame,
  Siren,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { toggleSetupGuideVisibility } from "@/server/actions/onboarding.actions";
import { dismissServiceOffer } from "@/server/actions/service-request.actions";
import type { SetupGuideProgress, SetupGuideGroup } from "@/server/actions/onboarding.actions";
import { ServiceRequestDialog } from "./service-request-dialog";

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Network,
  BookOpen,
  ShieldAlert,
  PenLine,
  ClipboardCheck,
  FileCheck,
  AlertTriangle,
  Bell,
  Flame,
  Siren,
};

interface SetupGuideProps {
  tenantId: string;
  progress: SetupGuideProgress;
}

export function SetupGuide({ tenantId, progress }: SetupGuideProps) {
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const g of progress.groups) {
        initial[g.key] = g.percentage < 100;
      }
      return initial;
    },
  );
  const [offerDismissed, setOfferDismissed] = useState(progress.serviceOfferDismissed);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [isDismissing, startDismissTransition] = useTransition();

  if (hidden) return null;

  const allDone = progress.completedCount === progress.totalCount;
  const quickDone = progress.quickCompletedCount === progress.quickTotalCount;

  const quickGroups = progress.groups.filter((g) => g.phase === "quick");
  const fullGroups = progress.groups.filter((g) => g.phase === "full");

  function handleHide() {
    startTransition(async () => {
      const result = await toggleSetupGuideVisibility({ tenantId, hidden: true });
      if (result.success) setHidden(true);
    });
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleDismissOffer() {
    startDismissTransition(async () => {
      const result = await dismissServiceOffer();
      if (result.success) setOfferDismissed(true);
    });
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {allDone ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Trophy className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">
                  {allDone ? "Klar for tilsyn!" : "Bli klar for tilsyn"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {allDone
                    ? "Alle HMS-steg er fullført – du er klar for fullstendig tilsyn!"
                    : `${progress.compliancePercentage}% compliance – ${progress.completedCount} av ${progress.totalCount} steg fullført`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHide}
              disabled={isPending}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <EyeOff className="mr-1 h-3 w-3" />
              )}
              Skjul
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={progress.compliancePercentage} className="h-2" />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Grunnoppsett</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {quickDone ? "Ferdig" : `${progress.quickPercentage}%`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {quickDone
                ? "Grunnleggende HMS-krav er oppfylt."
                : "Fullfør disse stegene for å komme i gang med HMS-systemet."}
            </p>
            <div className="space-y-3">
              {quickGroups.map((group) => (
                <StepGroup
                  key={group.key}
                  group={group}
                  expanded={expandedGroups[group.key] ?? false}
                  onToggle={() => toggleGroup(group.key)}
                />
              ))}
            </div>
          </div>

          {fullGroups.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Fullstendig tilsynsklar</h3>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {progress.fullPercentage === 100 ? "Ferdig" : `${progress.fullPercentage}%`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                For full compliance ved tilsyn fra Arbeidstilsynet, brannvesen o.l.
              </p>
              <div className="space-y-3">
                {fullGroups.map((group) => (
                  <StepGroup
                    key={group.key}
                    group={group}
                    expanded={expandedGroups[group.key] ?? false}
                    onToggle={() => toggleGroup(group.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {!offerDismissed && !allDone && (
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Trenger du hjelp? Vi kan sette opp HMS-systemet for deg.{" "}
                <button
                  type="button"
                  onClick={() => setShowServiceDialog(true)}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Les mer
                </button>
              </p>
              <button
                type="button"
                onClick={handleDismissOffer}
                disabled={isDismissing}
                className="shrink-0 p-1 text-muted-foreground/50 hover:text-muted-foreground"
              >
                {isDismissing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceRequestDialog
        open={showServiceDialog}
        onOpenChange={setShowServiceDialog}
      />
    </>
  );
}

function StepGroup({
  group,
  expanded,
  onToggle,
}: {
  group: SetupGuideGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const done = group.percentage === 100;

  return (
    <div className="rounded-lg border bg-background/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${done ? "text-green-600" : "text-foreground"}`}>
              {group.title}
            </span>
            <span className="text-xs text-muted-foreground">({group.legalRef})</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {group.completedCount}/{group.totalCount}
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${group.percentage}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-1 pb-1">
          {group.steps.map((step) => {
            const Icon = ICON_MAP[step.icon] ?? Circle;

            return (
              <Link
                key={step.key}
                href={step.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background transition-colors group-hover:border-primary/30">
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                  {!step.completed && (
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  )}
                </div>
                {!step.completed && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
