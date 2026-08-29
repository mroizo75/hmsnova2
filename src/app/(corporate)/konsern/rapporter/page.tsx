"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function KonsernRapporterPage() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/konsern/rapport/${selectedYear}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ukjent feil" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HMS-rapport-${selectedYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Rapport lastet ned" });
    } catch (err) {
      toast({
        title: "Kunne ikke generere rapport",
        description: err instanceof Error ? err.message : "En feil oppstod",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generer og last ned HMS-rapporter for konsernet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-5 w-5 text-blue-600" />
            Årlig HMS-samlerapport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Rapporten inneholder en samlet oversikt over HMS-status for alle bedrifter i konsernet,
            inkludert compliance-score, hendelsesstatistikk, opplæringsstatus, vernerunder og
            psykososialt arbeidsmiljø.
          </p>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              <strong>Innhold:</strong> Ledersammendrag, HMS-compliance per bedrift, hendelsesanalyse
              (type/alvorlighet/trender), opplæringsstatus, vernerunder, psykososialt arbeidsmiljø
              (aggregert), og varsler/anbefalinger.
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Velg år</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Last ned HMS-rapport {selectedYear}
            </Button>
          </div>

          <div className="text-[10px] text-gray-400 space-y-0.5">
            <p>Hjemmel: Internkontrollforskriften § 5, AML kap. 3–5</p>
            <p>Psykososiale data: kun aggregerte scores med min. 5 besvarelser (GDPR Art. 9)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
