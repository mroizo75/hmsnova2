"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CheckCircle2, Circle, SkipForward, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeBoardingTask, skipBoardingTask } from "@/server/actions/boarding.actions";
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
  tasks: TaskItem[];
  canEdit: boolean;
  currentUserId: string;
}

export function BoardingTaskList({ tasks, canEdit, currentUserId }: BoardingTaskListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleComplete(taskId: string) {
    setLoadingId(taskId);
    await completeBoardingTask({ id: taskId });
    setLoadingId(null);
  }

  async function handleSkip(taskId: string) {
    setLoadingId(taskId);
    await skipBoardingTask({ id: taskId });
    setLoadingId(null);
  }

  const categories = [...new Set(tasks.map((t) => t.category ?? "Annet"))];

  return (
    <div className="space-y-6">
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
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {task.status === "SKIPPED" && (
                            <SkipForward className="h-5 w-5 text-gray-400" />
                          )}
                          {task.status === "PENDING" && isOverdue && (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                          {task.status === "PENDING" && !isOverdue && (
                            <Circle className="h-5 w-5 text-muted-foreground" />
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
