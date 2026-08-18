"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HmsTrendPoint } from "@/server/actions/admin-hms-stats.actions";

interface HmsTrendChartProps {
  data: HmsTrendPoint[];
}

export function HmsTrendChart({ data }: HmsTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>HMS-trend siste 12 måneder</CardTitle>
        <CardDescription>
          Nye avvik og fullførte tiltak per måned (alle bedrifter)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="incidents"
                name="Nye avvik"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="measures"
                name="Tiltak fullført"
                stroke="hsl(142 71% 45%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const months = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
  return `${months[Number(month) - 1]} ${year?.slice(2)}`;
}
