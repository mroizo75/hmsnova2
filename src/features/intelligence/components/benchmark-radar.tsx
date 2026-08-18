"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

interface BenchmarkRadarProps {
  tenantScores: {
    incidentScore: number;
    trainingScore: number;
    measureScore: number;
    inspectionScore: number;
    complianceScore: number;
  };
  industryLabel: string;
}

export function BenchmarkRadar({ tenantScores, industryLabel }: BenchmarkRadarProps) {
  const data = [
    { metric: "Avvikshandtering", score: tenantScores.incidentScore, benchmark: 60 },
    { metric: "Opplaering", score: tenantScores.trainingScore, benchmark: 65 },
    { metric: "Tiltak", score: tenantScores.measureScore, benchmark: 55 },
    { metric: "Inspeksjoner", score: tenantScores.inspectionScore, benchmark: 50 },
    { metric: "Compliance", score: tenantScores.complianceScore, benchmark: 60 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Din bedrift vs. bransjesnittet</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Din bedrift"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
            <Radar
              name={`${industryLabel} (snitt)`}
              dataKey="benchmark"
              stroke="#9ca3af"
              fill="#9ca3af"
              fillOpacity={0.1}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
