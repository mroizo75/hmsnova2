"use client";

/**
 * RUH-rapport PDF-eksport knapp
 * Kaller server-side API /api/ruh/[id]/pdf for branded PDF
 */

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface RuhPDFExportProps {
  ruhId: string;
  ruhNummer?: string | null;
}

export function RuhPDFExport({ ruhId, ruhNummer }: RuhPDFExportProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/ruh/${ruhId}/pdf`);
      if (!res.ok) throw new Error("Feil ved generering");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RUH-rapport-${ruhNummer ?? ruhId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Stille feil
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={generating} className="gap-2">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Last ned PDF
    </Button>
  );
}
