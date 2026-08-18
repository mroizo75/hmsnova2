"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type IndustrySnapshotSummary } from "@/server/actions/intelligence-admin.actions";
import Link from "next/link";

const INDUSTRY_LABELS: Record<string, string> = {
  construction: "Bygg og anlegg",
  elektro: "Elektro og energi",
  offshore: "Offshore og petroleum",
  marine: "Maritime og sjofart",
  oil_gas: "Olje og gass",
  fiskeri: "Fiskeri og havbruk",
  bergverk: "Bergverk og gruvedrift",
  healthcare: "Helsevesen",
  manufacturing: "Industri og produksjon",
  retail: "Handel og service",
  transport: "Transport og logistikk",
  hospitality: "Hotell og restaurant",
  education: "Utdanning",
  technology: "Teknologi og IT",
  agriculture: "Landbruk",
  other: "Annet",
};

function getRiskLevel(snapshot: IndustrySnapshotSummary): "low" | "medium" | "high" | "critical" {
  if (snapshot.trir != null && snapshot.trir > 5) return "critical";
  if (snapshot.trir != null && snapshot.trir > 3) return "high";
  if (snapshot.risksOpenCount > snapshot.tenantCount * 5) return "high";
  if (snapshot.incidentCount > snapshot.tenantCount * 3) return "medium";
  return "low";
}

const riskColors = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

interface IndustryHeatmapProps {
  snapshots: IndustrySnapshotSummary[];
}

export function IndustryHeatmap({ snapshots }: IndustryHeatmapProps) {
  const latestByIndustry = new Map<string, IndustrySnapshotSummary>();
  for (const s of snapshots) {
    if (!latestByIndustry.has(s.industry)) {
      latestByIndustry.set(s.industry, s);
    }
  }

  const sorted = Array.from(latestByIndustry.values()).sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return riskOrder[getRiskLevel(a)] - riskOrder[getRiskLevel(b)];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bransjeoversikt — Risikoniva</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((s) => {
            const risk = getRiskLevel(s);
            return (
              <Link
                key={s.industry}
                href={`/admin/intelligence/${s.industry}`}
                className={`rounded-lg border p-4 transition-shadow hover:shadow-md ${riskColors[risk]}`}
              >
                <div className="font-medium text-sm">
                  {INDUSTRY_LABELS[s.industry] || s.industry}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span>Bedrifter: {s.tenantCount}</span>
                  <span>Avvik: {s.incidentCount}</span>
                  <span>TRIR: {s.trir?.toFixed(1) ?? "—"}</span>
                  <span>Apne risikoer: {s.risksOpenCount}</span>
                </div>
              </Link>
            );
          })}
        </div>
        {sorted.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Ingen data enda. Kjor snapshot-jobben for a generere bransjestatistikk.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
