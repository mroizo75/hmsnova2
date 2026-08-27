"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, getWeek } from "date-fns";
import { nb } from "date-fns/locale";

interface WeekNavigationProps {
  weekStart: Date;
  onWeekChange: (newStart: Date) => void;
}

export function WeekNavigation({ weekStart, onWeekChange }: WeekNavigationProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1, locale: nb });
  const weekNumber = getWeek(weekStart, { weekStartsOn: 1, locale: nb });
  const isCurrentWeek =
    startOfWeek(new Date(), { weekStartsOn: 1, locale: nb }).getTime() === weekStart.getTime();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onWeekChange(subWeeks(weekStart, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-center min-w-[200px]">
        <p className="text-sm font-semibold">
          Uke {weekNumber}, {format(weekStart, "yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(weekStart, "d. MMM", { locale: nb })} – {format(weekEnd, "d. MMM", { locale: nb })}
        </p>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onWeekChange(addWeeks(weekStart, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1, locale: nb }))}
        >
          I dag
        </Button>
      )}
    </div>
  );
}
