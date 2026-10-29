"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, Circle, SkipForward, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeAllBoardingTasks, completeBoardingTask, skipBoardingTask } from "@/server/actions/boarding.actions";
import type { BoardingTaskStatus } from "@prisma/client";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: BoardingTaskStatus;
  assigneeRole: string;
  assigneeId: string | null;
  assignee: { id: string; name: string | null } | null;
  completedBy: { id: string; name: string | null } | null;
  completedAt: string | null;
  dueDate: string | null;
  category: string | null;
  isRequired: boolean;
  legalRef: string | null;
  notes: string | null;
  sortOrder: number;
}

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Ansatt",
  MANAGER: "Leder",
  HR: "HR",
  IT: "IT",
};

interface BoardingTaskListProps {
  boardingId: string;
  tasks: TaskItem[];
  canEdit: boolean;
  currentUserId: string;
}

export function BoardingTaskList({ boardingId, tasks, canEdit, currentUserId }: BoardingTaskListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [completingAll, setCompletingAll] = useState(false);
  const pendingCount = tasks.filter((task) => task.status === "PENDING").length;

  async function handleComplete(taskId: string) {
    setLoadingId(taskId);
    await completeBoardingTask({ id: taskId });
    setLoadingId(null);
    router.refresh();
  }

  async function handleSkip(taskId: string) {
    setLoadingId(taskId);
    await skipBoardingTask({ id: taskId });
    setLoadingId(null);
    router.refresh();
  }

  async function handleCompleteAll() {
    setCompletingAll(true);
    await completeAllBoardingTasks(boardingId);
    setCompletingAll(false);
    router.refresh();
  }

  const categories = [...new Set(tasks.map((t) => t.category ?? "Annet"))];

  return (
    <div className="space-y-6">
      {canEdit && pendingCount > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="bg-transparent" onClick={handleCompleteAll} disabled={completingAll}>
            {completingAll ? "Huker av..." : `Huk av alle (${pendingCount})`}
          </Button>
        </div>
      )}
      {categories.map((cat) => {
        const catTasks = tasks.filter((t) => (t.category ?? "Annet") === cat);
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{cat}</h3>
            <div className="space-y-2">
              {catTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status === "PENDING";
                const isMyTask = task.assigneeId === currentUserId;

                return (
                  <Card key={task.id} className={isOverdue ? "border-red-200" : ""}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {task.status === "COMPLETED" && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="Fullført" />
                          )}
                          {task.status === "SKIPPED" && (
                            <SkipForward className="h-5 w-5 text-gray-400" aria-label="Hoppet over" />
                          )}
                          {task.status === "PENDING" && (canEdit || isMyTask) && (
                            <button
                              type="button"
                              className="rounded-sm"
                              aria-label={`Huk av ${task.title}`}
                              disabled={loadingId === task.id}
                              onClick={() => handleComplete(task.id)}
                            >
                              {isOverdue ? (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          {task.status === "PENDING" && !(canEdit || isMyTask) && (
                            isOverdue ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${task.status !== "PENDING" ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </span>
            {task.isRequired && task.status === "PENDING" && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                {task.legalRef ? "Lovpålagt" : "Påkrevd"}
                              </Badge>
                            )}
                            {!task.isRequired && task.status === "PENDING" && (
                              <Badge variant="secondary" className="text-xs">
                                Anbefalt
                              </Badge>
                            )}
                            {task.legalRef && (
                              <span className="text-xs text-muted-foreground">({task.legalRef})</span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{ROLE_LABELS[task.assigneeRole] ?? task.assigneeRole}</span>
                            {task.assignee?.name && <span>({task.assignee.name})</span>}
                            {task.dueDate && (
                              <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                Frist: {format(new Date(task.dueDate), "d. MMM", { locale: nb })}
                              </span>
                            )}
                            {task.completedBy && task.completedAt && (
                              <span>
                                Fullført av {task.completedBy.name}{" "}
                                {format(new Date(task.completedAt), "d. MMM", { locale: nb })}
                              </span>
                            )}
                          </div>
                        </div>

                        {task.status === "PENDING" && (canEdit || isMyTask) && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleComplete(task.id)}
                              disabled={loadingId === task.id}
                            >
                              {loadingId === task.id ? "..." : "Fullfør"}
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSkip(task.id)}
                                disabled={loadingId === task.id}
                              >
                                Hopp over
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
