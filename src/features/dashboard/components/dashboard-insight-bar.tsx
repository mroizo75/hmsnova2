"use client";

import { useState } from "react";
import { Sparkles, TriangleAlert, ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TenantAlert } from "@/lib/tenant-alerts";
import { TenantAlertsWidget } from "@/features/dashboard/components/tenant-alerts-widget";
import { AiAssistantPanel } from "@/features/dashboard/components/ai-assistant-panel";

type OpenPanel = "alerts" | "ai" | null;

interface DashboardInsightBarProps {
  alerts: TenantAlert[];
  aiEnabled: boolean;
}

export function DashboardInsightBar({ alerts, aiEnabled }: DashboardInsightBarProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const hasAlerts = alerts.length > 0;

  function toggle(panel: OpenPanel) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={openPanel === "alerts"}
          onClick={() => toggle("alerts")}
          className={cn(
            "h-9 gap-2",
            openPanel === "alerts" && "border-foreground/30 bg-muted",
            hasAlerts && criticalCount > 0 && openPanel !== "alerts" && "border-red-200 text-red-700 hover:bg-red-50",
            hasAlerts && criticalCount === 0 && openPanel !== "alerts" && "border-amber-200 text-amber-800 hover:bg-amber-50",
          )}
        >
          {hasAlerts ? (
            <TriangleAlert className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          )}
          <span>HMS-varsler</span>
          {hasAlerts ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[11px] font-semibold",
                criticalCount > 0 ? "bg-red-600 text-white" : "bg-amber-500 text-white",
              )}
            >
              {alerts.length}
            </span>
          ) : (
            <span className="text-[11px] font-normal text-muted-foreground">OK</span>
          )}
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", openPanel === "alerts" && "rotate-180")}
          />
        </Button>

        {aiEnabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={openPanel === "ai"}
            onClick={() => toggle("ai")}
            className={cn("h-9 gap-2", openPanel === "ai" && "border-foreground/30 bg-muted")}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI-assistent</span>
            <ChevronDown
              className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", openPanel === "ai" && "rotate-180")}
            />
          </Button>
        )}
      </div>

      {openPanel === "alerts" && <TenantAlertsWidget alerts={alerts} />}
      {openPanel === "ai" && aiEnabled && <AiAssistantPanel active />}
    </div>
  );
}
