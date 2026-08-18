"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight } from "lucide-react";

interface RecentIncidentsCardProps {
  incidents: Array<{
    id: string;
    title: string;
    location: string;
    occurredAt: string;
    status: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Åpen", className: "bg-red-100 text-red-700 border-red-200" },
  INVESTIGATING: { label: "Under behandling", className: "bg-amber-100 text-amber-700 border-amber-200" },
  ACTION_TAKEN: { label: "Tiltak iverksatt", className: "bg-blue-100 text-blue-700 border-blue-200" },
  CLOSED: { label: "Lukket", className: "bg-green-100 text-green-700 border-green-200" },
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecentIncidentsCard({ incidents }: RecentIncidentsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Siste avvik
          </CardTitle>
          <Link
            href="/dashboard/incidents"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Se alle
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0 divide-y">
          {incidents.map((incident) => {
            const statusConf = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.OPEN;
            return (
              <Link
                key={incident.id}
                href={`/dashboard/incidents/${incident.id}`}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium truncate">{incident.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {incident.location && (
                      <span className="text-xs text-muted-foreground truncate">{incident.location}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(incident.occurredAt)}</span>
                  </div>
                </div>
                <Badge className={`shrink-0 text-[11px] ${statusConf.className}`}>
                  {statusConf.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
