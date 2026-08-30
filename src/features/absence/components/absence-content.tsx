"use client";

import { useState } from "react";
import Link from "next/link";
import type { AbsenceType, AbsenceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { AbsenceList } from "./absence-list";
import { AbsenceCalendar } from "./absence-calendar";
import { cn } from "@/lib/utils";
import { Plus, BarChart3, List, CalendarDays } from "lucide-react";

type AbsenceItem = {
  id: string;
  type: AbsenceType;
  status: AbsenceStatus;
  startDate: Date;
  endDate: Date;
  workdays: number;
  percentage: number;
  employee: { id: string; name: string | null; email: string };
};

interface AbsenceContentProps {
  absences: AbsenceItem[];
  permissions: {
    canCreateAbsence: boolean;
    canApproveAbsence: boolean;
    canExportAbsenceStats: boolean;
  };
}

type ViewMode = "list" | "calendar";

export function AbsenceContent({ absences, permissions }: AbsenceContentProps) {
  const [view, setView] = useState<ViewMode>("list");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="inline-flex rounded-lg border bg-muted p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-4 w-4" />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Kalender
          </button>
        </div>

        <div className="flex gap-2">
          {permissions.canExportAbsenceStats && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/fravaer/statistikk">
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistikk
              </Link>
            </Button>
          )}
          {permissions.canCreateAbsence && (
            <Button asChild>
              <Link href="/dashboard/fravaer/ny">
                <Plus className="h-4 w-4 mr-2" />
                Nytt fravær
              </Link>
            </Button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <AbsenceList
          absences={absences}
          canApprove={permissions.canApproveAbsence}
        />
      ) : (
        <AbsenceCalendar absences={absences} />
      )}
    </div>
  );
}
