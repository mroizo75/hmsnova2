"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { upsertWeekEntry } from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface TimeEntry {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  timeType: string;
  project: { id: string; name: string; code: string | null };
}

interface WeekGridProps {
  weekStart: Date;
  timeEntries: TimeEntry[];
  projects: Project[];
  dailyNorm: number;
  onEntryChanged: () => void;
  userId?: string;
}

type CellKey = `${string}_${number}`;

function buildGridData(
  timeEntries: TimeEntry[],
  weekStart: Date
): Map<string, number[]> {
  const grid = new Map<string, number[]>();

  for (const entry of timeEntries) {
    if (!["NORMAL", "OVERTIME_50", "OVERTIME_40", "OVERTIME_100", "WEEKEND"].includes(entry.timeType)) continue;

    const entryDate = new Date(entry.date);
    const dayIndex = Math.round((entryDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex < 0 || dayIndex > 6) continue;

    const key = entry.projectId;
    if (!grid.has(key)) grid.set(key, [0, 0, 0, 0, 0, 0, 0]);
    grid.get(key)![dayIndex] += entry.hours;
  }

  return grid;
}

function CellInput({
  value,
  onSave,
  dayIndex,
  dailyNorm,
}: {
  value: number;
  onSave: (hours: number) => void;
  dayIndex: number;
  dailyNorm: number;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isWeekend = dayIndex >= 5;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    const parsed = parseFloat(inputValue.replace(",", "."));
    if (isNaN(parsed)) return;
    const rounded = Math.round(parsed * 10) / 10;
    if (rounded === value) return;
    onSave(Math.max(0, rounded));
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Tab") handleSave();
        }}
        className="w-full h-full text-center text-sm font-medium bg-transparent border-0 outline-none ring-2 ring-blue-500 rounded"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setInputValue(value > 0 ? String(value) : "");
        setEditing(true);
      }}
      className={cn(
        "w-full h-full text-center text-sm font-medium rounded transition-colors cursor-text",
        value === 0 && "text-muted-foreground/40 hover:bg-slate-100",
        value > 0 && value < dailyNorm && !isWeekend && "bg-amber-50 text-amber-800",
        value > 0 && value >= dailyNorm && !isWeekend && "bg-green-50 text-green-800",
        value > dailyNorm && "bg-blue-50 text-blue-800",
        value > 0 && isWeekend && "bg-purple-50 text-purple-800"
      )}
    >
      {value > 0 ? value.toFixed(1) : "–"}
    </button>
  );
}

export function WeekGrid({
  weekStart,
  timeEntries,
  projects,
  dailyNorm,
  onEntryChanged,
  userId,
}: WeekGridProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<CellKey | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [gridData, setGridData] = useState(() => buildGridData(timeEntries, weekStart));

  useEffect(() => {
    setGridData(buildGridData(timeEntries, weekStart));
  }, [timeEntries, weekStart]);

  // Auto-vis standard-prosjekt (første) hvis gridet er tomt
  useEffect(() => {
    if (gridData.size === 0 && projects.length > 0) {
      setGridData(new Map([[projects[0].id, [0, 0, 0, 0, 0, 0, 0]]]));
    }
  }, [projects, gridData.size]);

  const activeProjectIds = Array.from(gridData.keys());
  const gridProjects = projects.filter((p) => activeProjectIds.includes(p.id));
  const availableProjects = projects.filter((p) => !activeProjectIds.includes(p.id));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const handleCellSave = useCallback(
    async (projectId: string, dayIndex: number, hours: number) => {
      const cellKey: CellKey = `${projectId}_${dayIndex}`;
      setSaving(cellKey);

      setGridData((prev) => {
        const next = new Map(prev);
        const row = [...(next.get(projectId) || [0, 0, 0, 0, 0, 0, 0])];
        row[dayIndex] = hours;
        next.set(projectId, row);
        return next;
      });

      const date = addDays(weekStart, dayIndex);
      const res = await upsertWeekEntry({
        projectId,
        date: format(date, "yyyy-MM-dd"),
        hours,
        ...(userId && { userId }),
      });

      if (!res.success) {
        toast({ variant: "destructive", title: res.error || "Kunne ikke lagre" });
        setGridData(buildGridData(timeEntries, weekStart));
      } else {
        onEntryChanged();
      }
      setSaving(null);
    },
    [weekStart, timeEntries, onEntryChanged, toast]
  );

  const handleAddProject = (projectId: string) => {
    setGridData((prev) => {
      const next = new Map(prev);
      next.set(projectId, [0, 0, 0, 0, 0, 0, 0]);
      return next;
    });
    setAddingProject(false);
  };

  const dayTotals = days.map((_, dayIdx) => {
    let total = 0;
    for (const row of gridData.values()) {
      total += row[dayIdx];
    }
    return total;
  });

  const weekTotal = dayTotals.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-medium px-3 py-2 min-w-[140px]">Prosjekt</th>
              {days.map((day, i) => (
                <th
                  key={i}
                  className={cn(
                    "text-center font-medium px-1 py-2 min-w-[60px]",
                    isSameDay(day, today) && "bg-blue-50",
                    i >= 5 && "text-muted-foreground"
                  )}
                >
                  <div className="text-xs">{format(day, "EEE", { locale: nb })}</div>
                  <div className="text-xs text-muted-foreground">{format(day, "d.")}</div>
                </th>
              ))}
              <th className="text-center font-medium px-2 py-2 min-w-[50px]">Sum</th>
            </tr>
          </thead>
          <tbody>
            {gridProjects.map((project) => {
              const row = gridData.get(project.id) || [0, 0, 0, 0, 0, 0, 0];
              const rowTotal = row.reduce((s, v) => s + v, 0);
              return (
                <tr key={project.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium text-xs truncate max-w-[160px]" title={project.name}>
                    {project.code ? `${project.code} – ` : ""}{project.name}
                  </td>
                  {row.map((hours, dayIdx) => (
                    <td
                      key={dayIdx}
                      className={cn(
                        "px-0.5 py-1",
                        isSameDay(days[dayIdx], today) && "bg-blue-50/50",
                        saving === `${project.id}_${dayIdx}` && "opacity-50"
                      )}
                    >
                      <div className="h-8 flex items-center justify-center">
                        <CellInput
                          value={hours}
                          onSave={(h) => handleCellSave(project.id, dayIdx, h)}
                          dayIndex={dayIdx}
                          dailyNorm={dailyNorm}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="text-center px-2 py-1.5 font-semibold text-xs">
                    {rowTotal > 0 ? rowTotal.toFixed(1) : "–"}
                  </td>
                </tr>
              );
            })}

            {gridProjects.length === 0 && !addingProject && (
              <tr>
                <td colSpan={9} className="text-center py-6 text-muted-foreground text-sm">
                  Ingen timer registrert denne uken. Legg til et prosjekt for å starte.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td className="px-3 py-2 font-semibold text-xs">TOTAL</td>
              {dayTotals.map((total, i) => (
                <td
                  key={i}
                  className={cn(
                    "text-center py-2 font-semibold text-xs",
                    isSameDay(days[i], today) && "bg-blue-50",
                    i < 5 && total > 0 && total < dailyNorm && "text-amber-600",
                    i < 5 && total >= dailyNorm && "text-green-700",
                    i < 5 && total > dailyNorm && "text-blue-700"
                  )}
                >
                  {total > 0 ? total.toFixed(1) : "–"}
                </td>
              ))}
              <td className="text-center py-2 font-bold text-sm">{weekTotal.toFixed(1)}</td>
            </tr>
            <tr className="bg-muted/20">
              <td className="px-3 py-1.5 text-xs text-muted-foreground">Norm</td>
              {days.map((_, i) => (
                <td key={i} className="text-center py-1.5 text-xs text-muted-foreground">
                  {i < 5 ? dailyNorm.toFixed(1) : "–"}
                </td>
              ))}
              <td className="text-center py-1.5 text-xs text-muted-foreground font-medium">
                {(dailyNorm * 5).toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {addingProject ? (
        <div className="flex items-center gap-2">
          <Select onValueChange={handleAddProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Velg prosjekt..." />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code ? `${p.code} – ` : ""}{p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setAddingProject(false)}>
            Avbryt
          </Button>
        </div>
      ) : (
        availableProjects.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setAddingProject(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Legg til prosjekt
          </Button>
        )
      )}
    </div>
  );
}
