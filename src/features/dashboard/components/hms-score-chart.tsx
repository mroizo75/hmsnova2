"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HMSScoreChartProps {
  data: Array<{
    month: string;
    score: number;
  }>;
}

export function HMSScoreChart({ data }: HMSScoreChartProps) {
  // Beregn trend
  const firstScore = data[0]?.score || 0;
  const lastScore = data[data.length - 1]?.score || 0;
  const trend = lastScore - firstScore;
  const trendPercentage = firstScore > 0 ? ((trend / firstScore) * 100).toFixed(1) : "0";

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">HMS-score</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Utvikling siste 6 måneder</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-semibold ${getTrendColor()}`}>
              {trend > 0 && "+"}{trendPercentage}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value}%`, 'HMS-score']}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorScore)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Målet er 90%+</span>
          <span className="font-semibold text-foreground">{lastScore}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

