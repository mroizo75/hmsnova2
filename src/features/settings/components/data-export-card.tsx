"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportTenantData } from "@/server/actions/data-export.actions";
import { Download, FileArchive, Loader2 } from "lucide-react";

interface DataExportCardProps {
  isAdmin: boolean;
}

export function DataExportCard({ isAdmin }: DataExportCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const handleExport = async () => {
    setLoading(true);
    const result = await exportTenantData();
    setLoading(false);

    if (!result.success) {
      const failure = result as { success: false; error: string };
      toast({
        variant: "destructive",
        title: "Eksport feilet",
        description: failure.error,
      });
      return;
    }

    const success = result as { success: true; data: { url: string; filename: string } };
    const link = document.createElement("a");
    link.href = success.data.url;
    link.download = success.data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Eksport klar",
      description: "Nedlastingen starter automatisk. Lenken er gyldig i 15 minutter.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileArchive className="h-5 w-5" />
          Eksporter mine data
        </CardTitle>
        <CardDescription>
          Last ned alt innholdet deres i HMS Nova samlet i én ZIP-fil – avvik/RUH, risikovurderinger,
          tiltak, rutiner og dokumenter (inkl. filer). Nyttig for GDPR-dataportabilitet
          (personvernforordningen art. 20) og som grunnlag ved en eventuell leverandørbytte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {loading ? "Genererer eksport..." : "Last ned alt"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Eksporten genereres når du trykker på knappen og kan ta noen sekunder for store bedrifter.
          Handlingen logges i revisjonssporet.
        </p>
      </CardContent>
    </Card>
  );
}
