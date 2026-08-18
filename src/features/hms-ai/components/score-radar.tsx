"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"

interface ScoreRadarProps {
  incidentScore: number
  routineScore: number
  inspectionScore: number
  trainingScore: number
  riskScore: number
  measureScore: number
  handbookScore: number
}

export function ScoreRadar(props: ScoreRadarProps) {
  const data = [
    { area: "Avvik", score: props.incidentScore },
    { area: "Rutiner", score: props.routineScore },
    { area: "Vernerunder", score: props.inspectionScore },
    { area: "Opplæring", score: props.trainingScore },
    { area: "Risiko", score: props.riskScore },
    { area: "Tiltak", score: props.measureScore },
    { area: "Håndbok", score: props.handbookScore },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="area" className="text-xs" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
        <Radar
          name="HMS-score"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
