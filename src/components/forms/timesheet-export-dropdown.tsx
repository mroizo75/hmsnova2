"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { getYear, getMonth, getWeek } from "date-fns";
import { nb } from "date-fns/locale";

interface TimesheetExportDropdownProps {
  formId: string;
  formTitle: string;
  allTemplatesView?: boolean;
}

export function TimesheetExportDropdown({
  formId,
  formTitle,
  allTemplatesView = false,
}: TimesheetExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = getMonth(now) + 1;
  const currentWeek = getWeek(now, { weekStartsOn: 1, locale: nb });

  const buildUrl = (params: Record<string, string>) => {
    const merged: Record<string, string> = { ...params };
    if (allTemplatesView) {
      merged.allTemplates = "1";
    }
    const search = new URLSearchParams(merged).toString();
    return `/api/forms/${formId}/submissions/export${search ? `?${search}` : ""}`;
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formTitle.replace(/[^a-z0-9æøå]/gi, "_")}_svar.xlsx`;
    a.click();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          Eksporter til Excel
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Velg periode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleDownload(buildUrl({}));
          }}
        >
          Alle utfyllinger
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleDownload(
              buildUrl({ period: "week", year: String(currentYear), week: String(currentWeek) })
            );
          }}
        >
          Denne uken (uke {currentWeek})
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleDownload(
              buildUrl({
                period: "month",
                year: String(currentYear),
                month: String(currentMonth),
              })
            );
          }}
        >
          Denne måneden
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleDownload(buildUrl({ period: "year", year: String(currentYear) }));
          }}
        >
          {currentYear}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
