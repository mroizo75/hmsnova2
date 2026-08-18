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
} from "lucide-react";
import { toggleSetupGuideVisibility } from "@/server/actions/onboarding.actions";
import type { SetupGuideProgress } from "@/server/actions/onboarding.actions";

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Network,
  BookOpen,
  ShieldAlert,
  PenLine,
};

interface SetupGuideProps {
  tenantId: string;
  progress: SetupGuideProgress;
}

export function SetupGuide({ tenantId, progress }: SetupGuideProps) {
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (hidden) return null;

  const percent =
    progress.totalSteps > 0
      ? Math.round((progress.totalCompleted / progress.totalSteps) * 100)
      : 0;

  const allDone = progress.totalCompleted === progress.totalSteps;

  function handleHide() {
    startTransition(async () => {
      const result = await toggleSetupGuideVisibility({
        tenantId,
        hidden: true,
      });
      if (result.success) setHidden(true);
    });
  }

  return (
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
                  ? "Alle grunnleggende HMS-steg er fullført. Godt jobbet!"
                  : `${progress.totalCompleted} av ${progress.totalSteps} steg fullført`}
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
      <CardContent className="space-y-4">
        <Progress value={percent} className="h-2" />

        <div className="space-y-1">
          {progress.steps.map((step) => {
            const Icon = ICON_MAP[step.icon] ?? Circle;

            return (
              <Link
                key={step.key}
                href={step.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background transition-colors group-hover:border-primary/30">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
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
      </CardContent>
    </Card>
  );
}
