"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface SeverityBar {
  label: string;
  value: number;
  color: string;
}

interface StatusBar {
  label: string;
  value: number;
  color: string;
}

interface TypeBar {
  label: string;
  inspections: number;
  findings: number;
}

interface MonthTrend {
  label: string;
  inspections: number;
  findings: number;
}

interface Props {
  bySeverity: SeverityBar[];
  byStatus: StatusBar[];
  byType: TypeBar[];
  findingsByStatus: StatusBar[];
  monthlyTrend: MonthTrend[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function SeverityChart({ data }: { data: SeverityBar[] }) {
  const reversed = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={reversed} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name="Antall funn" radius={[0, 4, 4, 0]}>
          {reversed.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: StatusBar[] }) {
  const active = data.filter((d) => d.value > 0);
  if (active.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Ingen data</div>;
  }

  const renderLabel = ({
    label,
    percent,
  }: {
    label?: string;
    percent?: number;
  }) => {
    if (!percent || percent <= 0.05) return "";
    return `${label} (${Math.round(percent * 100)}%)`;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={active as unknown as Record<string, unknown>[]}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={75}
          innerRadius={40}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => renderLabel(props)}
          labelLine={false}
        >
          {active.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FindingStatusChart({ data }: { data: StatusBar[] }) {
  const active = data.filter((d) => d.value > 0);
  if (active.length === 0) {
    return <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">Ingen funn</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={active} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name="Antall" radius={[4, 4, 0, 0]}>
          {active.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TypeChart({ data }: { data: TypeBar[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">Ingen data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        <Bar dataKey="inspections" name="Inspeksjoner" fill="#14532d" radius={[0, 4, 4, 0]} />
        <Bar dataKey="findings" name="Funn" fill="#dc2626" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthTrend[] }) {
  if (data.length === 0 || data.every((d) => d.inspections === 0 && d.findings === 0)) {
    return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Ingen data for månedstrend</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        <Line
          type="monotone"
          dataKey="inspections"
          name="Inspeksjoner"
          stroke="#14532d"
          strokeWidth={2.5}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="findings"
          name="Funn"
          stroke="#dc2626"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RapportCharts({ bySeverity, byStatus, byType, findingsByStatus, monthlyTrend }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Inspeksjonsstatus
          </h3>
          <StatusPieChart data={byStatus} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Funn per alvorlighetsgrad
          </h3>
          <SeverityChart data={bySeverity} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Funnstatus
          </h3>
          <FindingStatusChart data={findingsByStatus} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Funn og inspeksjoner per type
          </h3>
          <TypeChart data={byType} />
        </div>
      </div>

      {monthlyTrend.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Månedlig trend – inspeksjoner og funn
          </h3>
          <MonthlyTrendChart data={monthlyTrend} />
        </div>
      )}
    </div>
  );
}
