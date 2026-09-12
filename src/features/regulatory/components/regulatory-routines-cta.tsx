"use client";

import Link from "next/link";
import { ListChecks, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RegulatoryRoutineSuggestion } from "@/server/actions/regulatory.actions";

type Props = {
  suggestions: RegulatoryRoutineSuggestion[];
};

export function RegulatoryRoutinesCta({ suggestions }: Props) {
  if (suggestions.length === 0) return null;

  const publishedCount = suggestions.filter((s) => s.publishedRoutineId).length;
  const unpublishedRecommended = suggestions.filter(
    (s) => s.recommended && !s.publishedRoutineId,
  ).length;

  const pending = unpublishedRecommended > 0;
  const description = pending
    ? `${unpublishedRecommended} anbefalte rutiner er klare for publisering. De vises under Rutiner når du har publisert dem.`
    : publishedCount > 0
      ? `${publishedCount} rutiner er publisert ut fra regelverksprofilen. Åpne, tilpass og revider dem under Rutiner.`
      : "Regelverksprofilen har foreslått rutinemaler. Velg hvilke som skal gjelde under Rutiner.";

  return (
    <Card className={pending ? "border-blue-200 bg-blue-50/50" : undefined}>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ListChecks
            className={`mt-0.5 h-5 w-5 shrink-0 ${pending ? "text-blue-600" : "text-muted-foreground"}`}
          />
          <div>
            <p className={`text-sm font-medium ${pending ? "text-blue-900" : ""}`}>
              Rutiner fra regelverket
            </p>
            <p className={`text-sm ${pending ? "text-blue-700" : "text-muted-foreground"}`}>
              {description} Hjemmel: IK-HMS § 5.
            </p>
          </div>
        </div>
        <Button asChild variant={pending ? "default" : "outline"} className="shrink-0">
          <Link href="/dashboard/rutiner#regelverk-rutiner">
            {pending ? "Velg og publiser rutiner" : "Gå til rutiner"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
