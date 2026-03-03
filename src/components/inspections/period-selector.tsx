"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  { value: "1", label: "Januar" },
  { value: "2", label: "Februar" },
  { value: "3", label: "Mars" },
  { value: "4", label: "April" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

interface Props {
  currentYear: number;
  currentMonth: number | null;
}

export function PeriodSelector({ currentYear, currentMonth }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => thisYear - 2 + i);

  function navigate(year: number, month: number | null) {
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (month !== null) params.set("month", String(month));
    router.push(`${pathname}?${params.toString()}`);
  }

  function prevPeriod() {
    if (currentMonth !== null) {
      if (currentMonth === 1) navigate(currentYear - 1, 12);
      else navigate(currentYear, currentMonth - 1);
    } else {
      navigate(currentYear - 1, null);
    }
  }

  function nextPeriod() {
    if (currentMonth !== null) {
      if (currentMonth === 12) navigate(currentYear + 1, 1);
      else navigate(currentYear, currentMonth + 1);
    } else {
      navigate(currentYear + 1, null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap bg-muted/30 border rounded-lg p-3">
      <Button variant="outline" size="icon" onClick={prevPeriod} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={String(currentYear)}
        onValueChange={(v) => navigate(parseInt(v, 10), currentMonth)}
      >
        <SelectTrigger className="w-[90px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentMonth !== null ? String(currentMonth) : "all"}
        onValueChange={(v) => navigate(currentYear, v === "all" ? null : parseInt(v, 10))}
      >
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Hele året</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={nextPeriod} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>

      {currentMonth !== null && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => navigate(currentYear, null)}
        >
          Vis hele {currentYear}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-muted-foreground ml-auto"
        onClick={() =>
          navigate(new Date().getFullYear(), new Date().getMonth() + 1)
        }
      >
        Denne måneden
      </Button>
    </div>
  );
}
