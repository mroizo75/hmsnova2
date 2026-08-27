"use client";

import { useState, useCallback } from "react";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WeekGrid } from "./week-grid";
import { getWeekEntries } from "@/server/actions/time-registration.actions";

interface UserWeekSummary {
  userId: string;
  name: string;
  days: number[];
}

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

interface AdminTeamOverviewProps {
  weekStart: Date;
  users: UserWeekSummary[];
  projects: Project[];
  dailyNorm: number;
  isAdmin: boolean;
  onDataChanged: () => void;
}

const PAGE_SIZE = 15;

export function AdminTeamOverview({
  weekStart,
  users,
  projects,
  dailyNorm,
  isAdmin,
  onDataChanged,
}: AdminTeamOverviewProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<TimeEntry[]>([]);
  const [loadingExpand, setLoadingExpand] = useState(false);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginatedUsers = users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayHeaders = days.map((d) => format(d, "EEE d.", { locale: nb }));

  const handleToggleUser = useCallback(
    async (userId: string) => {
      if (expandedUserId === userId) {
        setExpandedUserId(null);
        setExpandedEntries([]);
        return;
      }

      setLoadingExpand(true);
      setExpandedUserId(userId);

      const result = await getWeekEntries(format(weekStart, "yyyy-MM-dd"), userId);
      if (result.success && result.data) {
        setExpandedEntries(result.data.timeEntries as TimeEntry[]);
      } else {
        setExpandedEntries([]);
      }
      setLoadingExpand(false);
    },
    [expandedUserId, weekStart]
  );

  const handleEntryChanged = useCallback(() => {
    if (expandedUserId) {
      handleToggleUser(expandedUserId);
      handleToggleUser(expandedUserId);
    }
    onDataChanged();
  }, [expandedUserId, handleToggleUser, onDataChanged]);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium w-8" />
              <th className="px-3 py-2 text-left font-medium min-w-[140px]">Ansatt</th>
              {dayHeaders.map((dh) => (
                <th key={dh} className="px-2 py-2 text-center font-medium w-16">
                  {dh}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium w-16">Sum</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u) => {
              const total = u.days.reduce((s, h) => s + h, 0);
              const isExpanded = expandedUserId === u.userId;

              return (
                <UserRow
                  key={u.userId}
                  user={u}
                  total={total}
                  dailyNorm={dailyNorm}
                  isExpanded={isExpanded}
                  isAdmin={isAdmin}
                  loadingExpand={loadingExpand && isExpanded}
                  expandedEntries={expandedEntries}
                  weekStart={weekStart}
                  projects={projects}
                  onToggle={() => handleToggleUser(u.userId)}
                  onEntryChanged={handleEntryChanged}
                />
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Ingen ansatte funnet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-muted-foreground">
            Side {page + 1} av {totalPages} ({users.length} ansatte)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Forrige
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Neste
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  total,
  dailyNorm,
  isExpanded,
  isAdmin,
  loadingExpand,
  expandedEntries,
  weekStart,
  projects,
  onToggle,
  onEntryChanged,
}: {
  user: UserWeekSummary;
  total: number;
  dailyNorm: number;
  isExpanded: boolean;
  isAdmin: boolean;
  loadingExpand: boolean;
  expandedEntries: TimeEntry[];
  weekStart: Date;
  projects: Project[];
  onToggle: () => void;
  onEntryChanged: () => void;
}) {
  const weeklyNorm = dailyNorm * 5;

  return (
    <>
      <tr
        className={cn(
          "border-b cursor-pointer hover:bg-muted/30 transition-colors",
          isExpanded && "bg-muted/20"
        )}
        onClick={onToggle}
      >
        <td className="px-3 py-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="px-3 py-2 font-medium">{user.name}</td>
        {user.days.map((hours, i) => (
          <td
            key={i}
            className={cn(
              "px-2 py-2 text-center tabular-nums",
              hours > 0 && hours < dailyNorm && "text-amber-600",
              hours >= dailyNorm && "text-green-600 font-medium",
              hours > dailyNorm && "text-blue-600 font-medium"
            )}
          >
            {hours > 0 ? hours.toFixed(1) : "–"}
          </td>
        ))}
        <td
          className={cn(
            "px-3 py-2 text-center font-semibold tabular-nums",
            total >= weeklyNorm ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {total.toFixed(1)}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={10} className="p-0">
            <div className="border-t bg-muted/10 p-4">
              {loadingExpand ? (
                <div className="text-center text-sm text-muted-foreground py-4">Laster...</div>
              ) : isAdmin ? (
                <WeekGrid
                  weekStart={weekStart}
                  timeEntries={expandedEntries}
                  projects={projects}
                  dailyNorm={dailyNorm}
                  onEntryChanged={onEntryChanged}
                  userId={user.userId}
                />
              ) : (
                <WeekGrid
                  weekStart={weekStart}
                  timeEntries={expandedEntries}
                  projects={projects}
                  dailyNorm={dailyNorm}
                  onEntryChanged={onEntryChanged}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
