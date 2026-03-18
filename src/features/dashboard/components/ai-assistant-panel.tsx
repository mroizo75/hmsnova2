"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAiDashboardAssistant } from "@/server/actions/ai-assistant.actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const DASHBOARD_AI_CACHE_KEY = "hmsnova.dashboard.aiAssistant.v1";
const DASHBOARD_AI_CACHE_TTL_MS = 1000 * 60 * 30;

interface DashboardAiCache {
  savedAt: number;
  nextActions: Array<{ title: string; href: string }>;
  monthlySummary: string;
}

const getActionTag = (href: string): string => {
  if (href.includes("/dashboard/actions")) return "Tiltak";
  if (href.includes("/dashboard/risks")) return "Risiko";
  if (href.includes("/dashboard/incidents")) return "Hendelse";
  if (href.includes("/dashboard/training")) return "Opplæring";
  if (href.includes("/dashboard/audits")) return "Revisjon";
  if (href.includes("/dashboard/inspections")) return "Vernerunde";
  if (href.includes("/dashboard/sja")) return "SJA";
  if (href.includes("/dashboard/goals")) return "Mål";
  return "Oppfølging";
};

export function AiAssistantPanel() {
  const [loading, setLoading] = useState(false);
  const [nextActions, setNextActions] = useState<Array<{ title: string; href: string }>>([]);
  const [monthlySummary, setMonthlySummary] = useState("");

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateAiDashboardAssistant();
      if (!result.success || !result.data) return;
      const next = Array.isArray(result.data.nextActions) ? result.data.nextActions : [];
      const summary = result.data.monthlySummary || "";
      setNextActions(next);
      setMonthlySummary(summary);
      if (typeof window !== "undefined") {
        const payload: DashboardAiCache = {
          savedAt: Date.now(),
          nextActions: next,
          monthlySummary: summary,
        };
        window.localStorage.setItem(DASHBOARD_AI_CACHE_KEY, JSON.stringify(payload));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(DASHBOARD_AI_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DashboardAiCache;
          if (
            typeof parsed.savedAt === "number" &&
            Date.now() - parsed.savedAt < DASHBOARD_AI_CACHE_TTL_MS
          ) {
            const cachedActions = Array.isArray(parsed.nextActions)
              ? parsed.nextActions
                  .map((item) => ({
                    title: typeof item?.title === "string" ? item.title.trim() : "",
                    href: typeof item?.href === "string" ? item.href.trim() : "/dashboard/actions",
                  }))
                  .filter((item) => item.title.length > 0)
              : [];
            setNextActions(cachedActions);
            setMonthlySummary(typeof parsed.monthlySummary === "string" ? parsed.monthlySummary : "");
          }
        }
      } catch {
        // ignore invalid local cache
      }
    }
    void handleGenerate();
  }, [handleGenerate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          AI-assistent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && nextActions.length === 0 && !monthlySummary && (
          <p className="text-sm text-muted-foreground">Laster AI-prioriteringer...</p>
        )}
        {nextActions.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-1">Neste beste handlinger</p>
            <ul className="list-disc ml-4 text-sm space-y-1">
              {nextActions.map((action) => (
                <li key={`${action.href}-${action.title}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                      {getActionTag(action.href)}
                    </Badge>
                    <Link href={action.href} className="underline underline-offset-2 hover:text-primary">
                      {action.title}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {monthlySummary && (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-1">Månedsoppsummering</p>
            <p className="text-sm text-muted-foreground">{monthlySummary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
