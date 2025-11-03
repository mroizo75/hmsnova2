"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatrixCellColor } from "@/features/risks/schemas/risk.schema";

interface RiskMatrixProps {
  selectedLikelihood?: number;
  selectedConsequence?: number;
  onCellClick?: (likelihood: number, consequence: number) => void;
  risks?: Array<{ likelihood: number; consequence: number }>;
}

const likelihoodLabels = [
  { value: 5, label: "Svært sannsynlig", desc: "Skjer ofte (>50%)" },
  { value: 4, label: "Sannsynlig", desc: "Kan skje (25-50%)" },
  { value: 3, label: "Mulig", desc: "Kan hende (10-25%)" },
  { value: 2, label: "Usannsynlig", desc: "Skjer sjelden (1-10%)" },
  { value: 1, label: "Svært usannsynlig", desc: "Nesten aldri (<1%)" },
];

const consequenceLabels = [
  { value: 1, label: "Ubetydelig", desc: "Ingen skade" },
  { value: 2, label: "Mindre", desc: "Førstehjelpsskade" },
  { value: 3, label: "Moderat", desc: "Fraværsskade" },
  { value: 4, label: "Alvorlig", desc: "Varig skade" },
  { value: 5, label: "Katastrofal", desc: "Dødsfall" },
];

export function RiskMatrix({
  selectedLikelihood,
  selectedConsequence,
  onCellClick,
  risks = [],
}: RiskMatrixProps) {
  const getRiskCount = (likelihood: number, consequence: number) => {
    return risks.filter(r => r.likelihood === likelihood && r.consequence === consequence).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>5x5 Risikomatrise</CardTitle>
        <CardDescription>
          Klikk på en celle for å velge sannsynlighet og konsekvens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-muted text-xs font-semibold">
                  Sannsynlighet<br/>↓<br/>Konsekvens →
                </th>
                {consequenceLabels.map((c) => (
                  <th key={c.value} className="border p-2 bg-muted text-xs">
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-muted-foreground font-normal">{c.desc}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {likelihoodLabels.map((l) => (
                <tr key={l.value}>
                  <td className="border p-2 bg-muted text-xs">
                    <div className="font-semibold">{l.label}</div>
                    <div className="text-muted-foreground font-normal">{l.desc}</div>
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
                        className={`border p-4 text-center cursor-pointer transition-all ${cellColor} ${
                          isSelected ? "ring-4 ring-primary ring-offset-2" : ""
                        }`}
                        onClick={() => onCellClick?.(l.value, c.value)}
                      >
                        <div className="text-white font-bold text-2xl">{score}</div>
                        {riskCount > 0 && (
                          <div className="text-white text-xs mt-1">
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
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span className="text-sm">Lav (1-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500 rounded"></div>
            <span className="text-sm">Moderat (6-11)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded"></div>
            <span className="text-sm">Høy (12-19)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded"></div>
            <span className="text-sm">Kritisk (20-25)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

