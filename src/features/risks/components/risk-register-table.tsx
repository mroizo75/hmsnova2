"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  RiskCategory,
  RiskControlEffectiveness,
  RiskControlStatus,
  RiskResponseStrategy,
  RiskStatus,
  RiskTrend,
} from "@prisma/client";
import { getExposureBadge, getExposureLevel, summarizeControls } from "@/features/risks/utils/risk-register";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  OPEN: "Identifisert",
  MITIGATING: "Tiltak iverksatt",
  ACCEPTED: "Akseptert",
  CLOSED: "Lukket",
};

interface RiskRegisterRow {
  id: string;
  title: string;
  category: RiskCategory;
  status: RiskStatus;
  score: number;
  residualScore?: number | null;
  owner?: { name: string | null; email: string | null } | null;
  responseStrategy: RiskResponseStrategy;
  trend: RiskTrend;
  nextReviewDate: Date | null;
  controls: Array<{ status: RiskControlStatus; effectiveness: RiskControlEffectiveness }>;
  documentCount: number;
  auditCount: number;
  measuresOpen: number;
}

interface RiskRegisterTableProps {
  rows: RiskRegisterRow[];
}

export function RiskRegisterTable({ rows }: RiskRegisterTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCategory = categoryFilter === "ALL" || row.category === categoryFilter;
      const matchesSearch = row.title.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [rows, categoryFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle kategorier</SelectItem>
              <SelectItem value="SAFETY">Sikkerhet (AML)</SelectItem>
              <SelectItem value="HEALTH">Helse (AML)</SelectItem>
              <SelectItem value="PSYCHOSOCIAL">Psykososialt (AML § 4-3)</SelectItem>
              <SelectItem value="ERGONOMIC">Ergonomisk (AML § 4-2)</SelectItem>
              <SelectItem value="PHYSICAL">Fysisk arbeidsmiljø</SelectItem>
              <SelectItem value="ORGANISATIONAL">Organisatorisk</SelectItem>
              <SelectItem value="ENVIRONMENTAL">Miljø (ISO 14001)</SelectItem>
              <SelectItem value="OPERATIONAL">Operasjonell</SelectItem>
              <SelectItem value="STRATEGIC">Strategisk (ISO 31000)</SelectItem>
              <SelectItem value="INFORMATION_SECURITY">Informasjonssikkerhet</SelectItem>
              <SelectItem value="LEGAL">Juridisk/Compliance</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Søk etter risiko..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-[220px]"
          />
        </div>
        <p className="text-sm text-muted-foreground">{filteredRows.length} av {rows.length} risikoer</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risiko</TableHead>
              <TableHead>Eksponering</TableHead>
              <TableHead>Rest-risiko</TableHead>
              <TableHead>Kontroller</TableHead>
              <TableHead>Strategi</TableHead>
              <TableHead>Neste gjennomgang</TableHead>
              <TableHead>Lenker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => {
              const exposureLevel = getExposureLevel(row.score, row.residualScore);
              const badge = getExposureBadge(exposureLevel);
              const controlSummary = summarizeControls(row.controls);

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <Link href={`/dashboard/risks/${row.id}`} className="font-semibold hover:underline">
                        {row.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {row.category} • {row.owner?.name || row.owner?.email || "Ikke satt"}
                      </p>
                      <Badge variant="outline">{statusLabels[row.status] ?? row.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${badge.className}`}>
                      {badge.label} ({row.score})
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.residualScore != null ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          Før: {row.score} → Etter: {row.residualScore}
                        </span>
                        <Badge variant="secondary">Restrisiko: {row.residualScore}</Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Ikke vurdert</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>
                      Effektive: <span className="font-medium">{controlSummary.effective}</span>
                    </p>
                    <p>
                      GAP: <span className="font-medium text-orange-600">{controlSummary.gaps}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pensjonert: {controlSummary.retired}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{row.responseStrategy}</p>
                    <p className="text-xs text-muted-foreground">Trend: {row.trend}</p>
                    {row.measuresOpen > 0 && (
                      <p className="text-xs text-orange-600">{row.measuresOpen} åpne tiltak</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.nextReviewDate ? (
                      format(row.nextReviewDate, "dd. MMM yyyy", { locale: nb })
                    ) : (
                      <span className="text-muted-foreground text-xs">Ikke satt</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>Dokumenter: {row.documentCount}</p>
                    <p>Revisjoner: {row.auditCount}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

