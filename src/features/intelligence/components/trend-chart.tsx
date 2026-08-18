"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { type TrendPoint } from "@/server/actions/intelligence-admin.actions";

interface TrendChartProps {
  trends: TrendPoint[];
  title?: string;
  metrics?: string[];
}

const METRIC_LABELS: Record<string, string> = {
  incidents_total: "Avvik totalt",
  measures_completed: "Tiltak fullfort",
  risks_open: "Apne risikoer",
  trir: "TRIR",
  training_compliance_rate: "Opplaeringsdekning (%)",
};

const METRIC_COLORS: Record<string, string> = {
  incidents_total: "#ef4444",
  measures_completed: "#22c55e",
  risks_open: "#f59e0b",
  trir: "#8b5cf6",
  training_compliance_rate: "#3b82f6",
};

export function IntelligenceTrendChart({ trends, title = "Trender over tid", metrics }: TrendChartProps) {
  const filteredMetrics = metrics || ["incidents_total", "measures_completed", "trir"];

  const periodSet = new Set<string>();
  for (const t of trends) {
    if (filteredMetrics.includes(t.metric)) {
      periodSet.add(t.period);
    }
  }

  const periods = Array.from(periodSet).sort();

  const chartData = periods.map((period) => {
    const point: Record<string, string | number> = { period };
    for (const metric of filteredMetrics) {
      const match = trends.find((t) => t.period === period && t.metric === metric);
      if (match) point[metric] = Math.round(match.value * 10) / 10;
    }
    return point;
  });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Ingen trenddata tilgjengelig enda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {filteredMetrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                name={METRIC_LABELS[metric] || metric}
                stroke={METRIC_COLORS[metric] || "#6b7280"}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
