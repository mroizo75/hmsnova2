"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ScoreHistoryEntry {
  scoreDate: Date | string
  overallScore: number
}

interface ScoreTrendChartProps {
  data: ScoreHistoryEntry[]
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  const chartData = data.map((entry) => ({
    dato: new Date(entry.scoreDate).toLocaleDateString("nb-NO", {
      day: "2-digit",
      month: "short",
    }),
    score: entry.overallScore,
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="dato" className="text-xs" />
        <YAxis domain={[0, 100]} className="text-xs" />
        <Tooltip
          formatter={(value: number) => [`${value}/100`, "HMS-score"]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
