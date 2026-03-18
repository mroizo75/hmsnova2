"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatrixCellColor } from "@/features/risks/schemas/risk.schema";

interface RiskMatrixProps {
  selectedLikelihood?: number;
  selectedConsequence?: number;
  onCellClick?: (likelihood: number, consequence: number) => void;
  risks?: Array<{
    likelihood: number;
    consequence: number;
    residualLikelihood?: number | null;
    residualConsequence?: number | null;
  }>;
  viewMode?: "initial" | "residual";
}

const likelihoodLabels = [
  { value: 5, label: "Svært sannsynlig", shortLabel: "Svært sann.", desc: "Skjer ofte (>50%)" },
  { value: 4, label: "Sannsynlig", shortLabel: "Sannsynlig", desc: "Kan skje (25-50%)" },
  { value: 3, label: "Mulig", shortLabel: "Mulig", desc: "Kan hende (10-25%)" },
  { value: 2, label: "Usannsynlig", shortLabel: "Usannsynlig", desc: "Skjer sjelden (1-10%)" },
  { value: 1, label: "Svært usannsynlig", shortLabel: "Svært usann.", desc: "Nesten aldri (<1%)" },
];

const consequenceLabels = [
  { value: 1, label: "Ubetydelig", shortLabel: "Ubetydelig", desc: "Ingen skade" },
  { value: 2, label: "Mindre", shortLabel: "Mindre", desc: "Førstehjelpsskade" },
  { value: 3, label: "Moderat", shortLabel: "Moderat", desc: "Fraværsskade" },
  { value: 4, label: "Alvorlig", shortLabel: "Alvorlig", desc: "Varig skade" },
  { value: 5, label: "Katastrofal", shortLabel: "Katastrofal", desc: "Dødsfall" },
];

export function RiskMatrix({
  selectedLikelihood,
  selectedConsequence,
  onCellClick,
  risks = [],
  viewMode = "initial",
}: RiskMatrixProps) {
  const getCoordinates = (risk: {
    likelihood: number;
    consequence: number;
    residualLikelihood?: number | null;
    residualConsequence?: number | null;
  }) => {
    if (
      viewMode === "residual" &&
      risk.residualLikelihood != null &&
      risk.residualConsequence != null
    ) {
      return {
        likelihood: risk.residualLikelihood,
        consequence: risk.residualConsequence,
      };
    }

    return {
      likelihood: risk.likelihood,
      consequence: risk.consequence,
    };
  };

  const getRiskCount = (likelihood: number, consequence: number) => {
    return risks.filter((risk) => {
      const coordinates = getCoordinates(risk);
      return coordinates.likelihood === likelihood && coordinates.consequence === consequence;
    }).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          5x5 Risikomatrise {viewMode === "residual" ? "– Etter tiltak (rest-risiko)" : "– Før tiltak"}
        </CardTitle>
        <CardDescription>
          {viewMode === "residual"
            ? "Viser rest-risiko. Når rest-risiko ikke er satt, vises opprinnelig vurdering."
            : "Klikk på en celle for å velge sannsynlighet og konsekvens"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full table-fixed border-collapse text-[11px] md:text-xs">
          <thead>
            <tr>
              <th className="w-24 border p-1.5 bg-muted text-[10px] md:text-xs font-semibold">
                Sannsynlighet / Konsekvens
              </th>
              {consequenceLabels.map((c) => (
                <th key={c.value} className="border p-1.5 bg-muted">
                  <div className="font-semibold leading-tight">{c.value}. {c.shortLabel}</div>
                  <div className="hidden lg:block text-muted-foreground font-normal text-[10px] leading-tight">
                    {c.desc}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {likelihoodLabels.map((l) => (
              <tr key={l.value}>
                <td className="border p-1.5 bg-muted align-top">
                  <div className="font-semibold leading-tight">{l.value}. {l.shortLabel}</div>
                  <div className="hidden lg:block text-muted-foreground font-normal text-[10px] leading-tight">
                    {l.desc}
                  </div>
                </td>
                {consequenceLabels.map((c) => {
                  const score = l.value * c.value;
                  const isSelected =
                    selectedLikelihood === l.value &&
                    selectedConsequence === c.value;
                  const riskCount = getRiskCount(l.value, c.value);
                  const cellColor = getMatrixCellColor(score);

                  return (
                    <td
                      key={`${l.value}-${c.value}`}
                      className={`border p-1.5 md:p-2 text-center transition-all h-14 md:h-16 ${cellColor} ${
                        onCellClick ? "cursor-pointer" : ""
                      } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                      onClick={() => onCellClick?.(l.value, c.value)}
                    >
                      <div className="text-white font-bold text-base md:text-lg leading-none">{score}</div>
                      {riskCount > 0 && (
                        <div className="text-white text-[10px] leading-tight mt-1">
                          {riskCount} risiko{riskCount > 1 ? "er" : ""}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs">Lav (1-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-xs">Moderat (6-11)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs">Høy (12-19)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs">Kritisk (20-25)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

