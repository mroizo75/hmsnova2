"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";
import {
  calculateProgress,
  getProgressColor,
  getStatusLabel,
  getStatusColor,
} from "@/features/goals/schemas/goal.schema";
import type { Goal } from "@prisma/client";

interface GoalProgressCardProps {
  goal: Goal;
}

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const progress = calculateProgress(goal.currentValue, goal.targetValue, goal.baseline);
  const progressColor = getProgressColor(progress);
  const statusLabel = getStatusLabel(goal.status);
  const statusColor = getStatusColor(goal.status);

  const isIncreasing = goal.baseline !== null && goal.currentValue !== null && goal.baseline !== undefined && goal.currentValue !== undefined
    ? goal.currentValue > goal.baseline
    : null;

  const daysToDeadline = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Fremgang
            </CardTitle>
            <CardDescription>Måling av måloppnåelse</CardDescription>
          </div>
          <Badge className={statusColor}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Fremgang</span>
            <span className="text-2xl font-bold">{progress}%</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
        </div>

        {/* Current vs Target */}
        <div className="grid grid-cols-3 gap-4">
          {goal.baseline !== null && goal.baseline !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Baseline</p>
              <p className="text-lg font-semibold">
                {goal.baseline.toFixed(1)} {goal.unit || ""}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Nåværende</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-primary">
                {goal.currentValue?.toFixed(1) || 0} {goal.unit || ""}
              </p>
              {isIncreasing !== null && (
                isIncreasing ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Mål</p>
            <p className="text-lg font-semibold">
              {goal.targetValue?.toFixed(1) || 0} {goal.unit || ""}
            </p>
          </div>
        </div>

        {/* Deadline info */}
        {goal.deadline && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Frist:</span>
            <span className="font-medium">
              {new Date(goal.deadline).toLocaleDateString("nb-NO")}
            </span>
            {daysToDeadline !== null && (
              <Badge
                variant={daysToDeadline < 30 ? "destructive" : "outline"}
                className="ml-2"
              >
                {daysToDeadline > 0
                  ? `${daysToDeadline} dager igjen`
                  : `${Math.abs(daysToDeadline)} dager over frist`}
              </Badge>
            )}
          </div>
        )}

        {/* Status indicators */}
        <div className="border-t pt-4">
          {goal.status === "ACHIEVED" && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Målet er oppnådd! 🎉</span>
            </div>
          )}
          {goal.status === "AT_RISK" && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <TrendingDown className="h-4 w-4" />
              <span className="font-medium">Målet er i risiko - handling kreves</span>
            </div>
          )}
          {goal.status === "FAILED" && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="font-medium">Målet ble ikke oppnådd</span>
            </div>
          )}
          {goal.status === "ACTIVE" && progress >= 75 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">På god vei mot målet!</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

