"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface IncidentTrendChartProps {
  data: Array<{ month: string; avvik: number; nestenulykker: number; ulykker: number }>;
}

const monthLabels: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

function formatMonth(key: string): string {
  const [, m] = key.split("-");
  return monthLabels[m] ?? m;
}

export function IncidentTrendChart({ data }: IncidentTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
        Ingen hendelsesdata ennå
      </div>
    );
  }

  const formatted = data.map((d) => ({ ...d, label: formatMonth(d.month) }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="avvik" name="Avvik" stackId="1" stroke="#f59e0b" fill="#fef3c7" />
          <Area type="monotone" dataKey="nestenulykker" name="Nestenulykker" stackId="1" stroke="#3b82f6" fill="#dbeafe" />
          <Area type="monotone" dataKey="ulykker" name="Ulykker" stackId="1" stroke="#ef4444" fill="#fee2e2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
