"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Clock } from "lucide-react";

type HistoryEntry = {
  id: string;
  action: string;
  userId: string;
  metadata: Record<string, any> | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  RISK_CREATED: "Risiko opprettet",
  RISK_UPDATED: "Risiko oppdatert",
  RISK_DELETED: "Risiko slettet",
  RISK_ASSESSMENT_CREATED: "Risikovurdering opprettet",
  RISK_ASSESSMENT_UPDATED: "Risikovurdering oppdatert",
  RISK_ASSESSMENT_APPROVED: "Risikovurdering godkjent",
  MEASURE_CREATED: "Tiltak opprettet",
  MEASURE_UPDATED: "Tiltak oppdatert",
  SJA_CREATED: "SJA opprettet",
  SJA_UPDATED: "SJA oppdatert",
  SJA_APPROVED: "SJA godkjent",
  SJA_HAZARD_ADDED: "Fare lagt til",
  SJA_HAZARD_UPDATED: "Fare oppdatert",
};

function formatMetadata(metadata: Record<string, any>): string {
  const parts: string[] = [];
  if (metadata.title) parts.push(metadata.title);
  if (metadata.status) parts.push(`Status: ${metadata.status}`);
  if (metadata.changeSummary) parts.push(metadata.changeSummary);
  return parts.join(" · ") || "";
}

export function ResourceHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Endringshistorikk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ingen endringer registrert ennå.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Endringshistorikk ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 border-l-2 border-muted pl-4 pb-3">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatMetadata(entry.metadata)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("nb-NO")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
