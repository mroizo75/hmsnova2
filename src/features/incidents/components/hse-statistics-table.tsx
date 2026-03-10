"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface YearRow {
  year: number;
  manHours: number;
  fatalities: number;
  lostTimeIncidents: number;
  lostWorkdays: number;
  restrictedWorkCases: number;
  medicalTreatmentCases: number;
  totalRecordable: number;
  trir: number | null;
}

interface HseStatisticsTableProps {
  data: YearRow[];
}

function trirBadge(trir: number | null) {
  if (trir === null) return <span className="text-muted-foreground text-sm">—</span>;
  if (trir === 0) return <Badge className="bg-green-100 text-green-800 border-green-300">0.00</Badge>;
  if (trir < 1) return <Badge className="bg-green-100 text-green-800 border-green-300">{trir.toFixed(2)}</Badge>;
  if (trir < 3) return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{trir.toFixed(2)}</Badge>;
  if (trir < 5) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">{trir.toFixed(2)}</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-300">{trir.toFixed(2)}</Badge>;
}

export function HseStatisticsTable({ data }: HseStatisticsTableProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Nøkkeltall</TableHead>
            {data.map((row) => (
              <TableHead key={row.year} className="text-center font-semibold">
                {row.year}
                {row.year === currentYear && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    (YTD)
                  </span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium text-muted-foreground text-sm">
              Arbeidede timer (Man Hours)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center">
                {row.manHours > 0
                  ? row.manHours.toLocaleString("nb-NO")
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
            ))}
          </TableRow>

          <TableRow className="bg-red-50/40">
            <TableCell className="font-medium text-sm">
              Antall dødsfall (Fatalities)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center font-semibold">
                {row.fatalities > 0 ? (
                  <span className="text-red-700">{row.fatalities}</span>
                ) : (
                  <span className="text-green-700">0</span>
                )}
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            <TableCell className="font-medium text-sm">
              Fraværsskader – LTI (Lost Time Incidents)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center font-semibold">
                {row.lostTimeIncidents > 0 ? (
                  <span className="text-red-600">{row.lostTimeIncidents}</span>
                ) : (
                  <span className="text-green-700">0</span>
                )}
              </TableCell>
            ))}
          </TableRow>

          <TableRow className="bg-muted/20">
            <TableCell className="font-medium text-sm pl-6 text-muted-foreground">
              ↳ Tapte arbeidsdager (Lost Workdays)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center text-muted-foreground">
                {row.lostWorkdays}
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            <TableCell className="font-medium text-sm">
              Begrenset arbeid (Restricted Work)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center font-semibold">
                {row.restrictedWorkCases > 0 ? (
                  <span className="text-amber-600">{row.restrictedWorkCases}</span>
                ) : (
                  <span className="text-green-700">0</span>
                )}
              </TableCell>
            ))}
          </TableRow>

          <TableRow>
            <TableCell className="font-medium text-sm">
              Legebehandling (Medical Treatment)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center font-semibold">
                {row.medicalTreatmentCases > 0 ? (
                  <span className="text-amber-600">{row.medicalTreatmentCases}</span>
                ) : (
                  <span className="text-green-700">0</span>
                )}
              </TableCell>
            ))}
          </TableRow>

          <TableRow className="bg-orange-50/60 border-t-2 border-orange-200">
            <TableCell className="font-bold text-sm">
              Totalt recordable (sum)
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center font-bold">
                {row.totalRecordable}
              </TableCell>
            ))}
          </TableRow>

          <TableRow className="bg-orange-100/60">
            <TableCell className="font-bold">
              TRIR
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (× 200 000 / timer)
              </span>
            </TableCell>
            {data.map((row) => (
              <TableCell key={row.year} className="text-center">
                {trirBadge(row.trir)}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
          TRIR &lt; 1.0 – Excellent
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          TRIR 1–3 – Godt
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
          TRIR 3–5 – Akseptabelt
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          TRIR &gt; 5 – Krever tiltak
        </div>
      </div>
    </div>
  );
}
