"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { nb } from "date-fns/locale";
import { Download, FileSpreadsheet, CalendarRange, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PeriodPreset = "this_month" | "last_month" | "this_week" | "last_week" | "custom";

interface ExportHistoryItem {
  id: string;
  periodLabel: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  invoiceCount: number;
  totalAmount: number;
  fileName: string;
  createdAt: Date | string;
  exportedBy: { name: string | null; email: string };
}

interface InvoiceExportPanelProps {
  history: ExportHistoryItem[];
  exportedInvoiceIds: string[];
}

function getPresetRange(preset: PeriodPreset): { from: string; to: string; label: string } {
  const now = new Date();
  switch (preset) {
    case "this_month": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return {
        from: format(s, "yyyy-MM-dd"),
        to: format(e, "yyyy-MM-dd"),
        label: format(s, "yyyy-MM"),
      };
    }
    case "last_month": {
      const prev = subMonths(now, 1);
      const s = startOfMonth(prev);
      const e = endOfMonth(prev);
      return {
        from: format(s, "yyyy-MM-dd"),
        to: format(e, "yyyy-MM-dd"),
        label: format(s, "yyyy-MM"),
      };
    }
    case "this_week": {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
      const weekNum = format(now, "'W'ww", { locale: nb });
      return {
        from: format(s, "yyyy-MM-dd"),
        to: format(e, "yyyy-MM-dd"),
        label: `${format(now, "yyyy")}-${weekNum}`,
      };
    }
    case "last_week": {
      const prev = subWeeks(now, 1);
      const s = startOfWeek(prev, { weekStartsOn: 1 });
      const e = endOfWeek(prev, { weekStartsOn: 1 });
      const weekNum = format(prev, "'W'ww", { locale: nb });
      return {
        from: format(s, "yyyy-MM-dd"),
        to: format(e, "yyyy-MM-dd"),
        label: `${format(prev, "yyyy")}-${weekNum}`,
      };
    }
    default:
      return { from: "", to: "", label: "egendefinert" };
  }
}

export function InvoiceExportPanel({ history, exportedInvoiceIds }: InvoiceExportPanelProps) {
  const router = useRouter();
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleExport = async () => {
    let from: string, to: string, label: string;

    if (preset === "custom") {
      if (!customFrom || !customTo) return;
      from = customFrom;
      to = customTo;
      label = `${customFrom}_${customTo}`;
    } else {
      const range = getPresetRange(preset);
      from = range.from;
      to = range.to;
      label = range.label;
    }

    setIsDownloading(true);
    try {
      const url = `/api/admin/invoices/export?from=${from}&to=${to}&label=${encodeURIComponent(label)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Eksport feilet");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `HMS-Nova-fakturaer-${label}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      router.refresh();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Eksporter til Excel
          </CardTitle>
          <CardDescription>
            Last ned fakturaer som Excel-fil formatert for manuell registrering i Fiken.
            Inkluderer bedrift, org.nr, beløp, mva, forfallsdato og beskrivelse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Periode</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Denne måneden</SelectItem>
                <SelectItem value="last_month">Forrige måned</SelectItem>
                <SelectItem value="this_week">Denne uken</SelectItem>
                <SelectItem value="last_week">Forrige uke</SelectItem>
                <SelectItem value="custom">Egendefinert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fra</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Til</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={isDownloading || (preset === "custom" && (!customFrom || !customTo))}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Laster ned…" : "Last ned Excel"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Nedlastingshistorikk
          </CardTitle>
          <CardDescription>
            Oversikt over tidligere eksporter. Fakturaer som allerede er lastet ned markeres i tabellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Ingen eksporter ennå
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Antall</TableHead>
                    <TableHead className="text-right">Beløp</TableHead>
                    <TableHead>Dato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.periodLabel}
                      </TableCell>
                      <TableCell className="text-right">{item.invoiceCount}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.totalAmount.toLocaleString("no-NO")} kr
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "dd.MM.yy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function InvoiceExportedBadge({ invoiceId, exportedIds }: { invoiceId: string; exportedIds: string[] }) {
  if (!exportedIds.includes(invoiceId)) return null;
  return (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
      <Check className="h-3 w-3" />
      Eksportert
    </Badge>
  );
}
