"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantHmsRow } from "@/server/actions/admin-hms-stats.actions";

const INDUSTRY_LABELS: Record<string, string> = {
  construction: "Bygg og anlegg",
  elektro: "Elektro og energi",
  offshore: "Offshore og petroleum",
  marine: "Maritime og sjøfart",
  oil_gas: "Olje og gass",
  fiskeri: "Fiskeri og havbruk",
  bergverk: "Bergverk og gruvedrift",
  healthcare: "Helsevesen",
  manufacturing: "Industri og produksjon",
  retail: "Handel og service",
  transport: "Transport og logistikk",
  hospitality: "Hotell og restaurant",
  education: "Utdanning",
  technology: "Teknologi og IT",
  agriculture: "Landbruk",
  other: "Annet",
};

type SortKey = "name" | "complianceScore" | "incidentsOpen" | "riskAssessments" | "inspections" | "trainings" | "measuresCompleted";

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

interface HmsStatsTableProps {
  rows: TenantHmsRow[];
}

export function HmsStatsTable({ rows }: HmsStatsTableProps) {
  const [industry, setIndustry] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("complianceScore");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = rows;
    if (industry !== "all") {
      result = result.filter((r) => r.industry === industry);
    }
    return [...result].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [rows, industry, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const uniqueIndustries = useMemo(() => {
    const set = new Set(rows.map((r) => r.industry).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [rows]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>HMS-oversikt per bedrift ({filtered.length})</CardTitle>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Alle bransjer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle bransjer</SelectItem>
              {uniqueIndustries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {INDUSTRY_LABELS[ind] || ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("name")}>
                    Bedrift <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Bransje</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("complianceScore")}>
                    Score <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("incidentsOpen")}>
                    Avvik <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("riskAssessments")}>
                    Risikoer <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("inspections")}>
                    Vernerunder <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("trainings")}>
                    Opplæring <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => toggleSort("measuresCompleted")}>
                    Tiltak <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Ingen bedrifter funnet
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/admin/tenants/${row.id}`} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                      {row.orgNumber && (
                        <span className="block text-xs text-muted-foreground">{row.orgNumber}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.industry ? (INDUSTRY_LABELS[row.industry] || row.industry) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={scoreColor(row.complianceScore)}>
                        {row.complianceScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={row.incidentsOpen > 0 ? "text-red-600 font-medium" : ""}>
                        {row.incidentsOpen}
                      </span>
                      <span className="text-muted-foreground"> / {row.incidentsClosed90d}</span>
                    </TableCell>
                    <TableCell>{row.riskAssessments}</TableCell>
                    <TableCell>{row.inspections}</TableCell>
                    <TableCell>{row.trainings}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{row.measuresCompleted}</span>
                      {row.measuresPending > 0 && (
                        <span className="text-muted-foreground"> / {row.measuresPending} ventende</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
