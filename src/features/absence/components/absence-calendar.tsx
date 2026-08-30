"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { nb } from "date-fns/locale";
import type { AbsenceType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TYPE_COLORS: Record<AbsenceType, string> = {
  SELF_CERTIFIED: "bg-orange-300",
  SICK_LEAVE: "bg-red-300",
  PARENTAL_LEAVE: "bg-purple-300",
  VACATION: "bg-blue-300",
  LEAVE_OF_ABSENCE: "bg-indigo-300",
  COMPENSATORY: "bg-teal-300",
  CARE_DAYS: "bg-pink-300",
  MILITARY: "bg-slate-300",
  BEREAVEMENT: "bg-stone-300",
  OTHER: "bg-gray-300",
};

const TYPE_LABELS: Record<AbsenceType, string> = {
  SELF_CERTIFIED: "Egenmelding",
  SICK_LEAVE: "Sykemelding",
  PARENTAL_LEAVE: "Foreldrepermisjon",
  VACATION: "Ferie",
  LEAVE_OF_ABSENCE: "Permisjon",
  COMPENSATORY: "Avspasering",
  CARE_DAYS: "Omsorgsdager",
  MILITARY: "Militærtjeneste",
  BEREAVEMENT: "Velferdspermisjon",
  OTHER: "Annet",
};

type CalendarAbsence = {
  id: string;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  employee: { name: string | null; email: string };
};

interface AbsenceCalendarProps {
  absences: CalendarAbsence[];
}

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

export function AbsenceCalendar({ absences }: AbsenceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const absencesByDay = useMemo(() => {
    const map = new Map<string, CalendarAbsence[]>();
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const matching = absences.filter((a) =>
        isWithinInterval(day, {
          start: new Date(a.startDate),
          end: new Date(a.endDate),
        }),
      );
      if (matching.length > 0) {
        map.set(key, matching);
      }
    }
    return map;
  }, [absences, days]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg capitalize">
            {format(currentDate, "MMMM yyyy", { locale: nb })}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="bg-background p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAbsences = absencesByDay.get(key) ?? [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={key}
                className={cn(
                  "bg-background min-h-[72px] p-1",
                  !isCurrentMonth && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-6 w-6 text-xs rounded-full",
                    isToday && "bg-primary text-primary-foreground font-bold",
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="space-y-0.5 mt-0.5">
                  {dayAbsences.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded px-1 py-0.5 text-[10px] leading-tight truncate",
                        TYPE_COLORS[a.type],
                      )}
                      title={`${a.employee.name ?? a.employee.email} – ${TYPE_LABELS[a.type]}`}
                    >
                      {a.employee.name?.split(" ")[0] ?? a.employee.email.split("@")[0]}
                    </div>
                  ))}
                  {dayAbsences.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{dayAbsences.length - 3} til
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          {(Object.entries(TYPE_COLORS) as [AbsenceType, string][]).map(
            ([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn("h-3 w-3 rounded", color)} />
                <span className="text-muted-foreground">
                  {TYPE_LABELS[type]}
                </span>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
