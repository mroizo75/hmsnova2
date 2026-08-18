"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle } from "lucide-react";
import { type Insight } from "@/server/actions/intelligence-admin.actions";

const iconMap = {
  increase: TrendingUp,
  decrease: TrendingDown,
  warning: AlertTriangle,
  positive: CheckCircle,
};

const colorMap = {
  increase: "text-orange-600",
  decrease: "text-blue-600",
  warning: "text-red-600",
  positive: "text-green-600",
};

interface InsightCardsProps {
  insights: Insight[];
}

export function InsightCards({ insights }: InsightCardsProps) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viktigste innsikter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight, i) => {
            const Icon = iconMap[insight.type];
            const color = colorMap[insight.type];

            return (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
