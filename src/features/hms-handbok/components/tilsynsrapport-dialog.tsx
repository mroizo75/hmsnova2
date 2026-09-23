"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TILSYN_TYPES, type TilsynType } from "@/lib/tilsynsrapport-config";
import { FileText, Loader2, Shield, UtensilsCrossed, Flame, ClipboardCheck, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TILSYN_ICONS: Record<TilsynType, React.ReactNode> = {
  arbeidstilsynet: <Shield className="h-6 w-6" />,
  mattilsynet: <UtensilsCrossed className="h-6 w-6" />,
  brannvesenet: <Flame className="h-6 w-6" />,
  vegvesen: <Truck className="h-6 w-6" />,
  revisjon: <ClipboardCheck className="h-6 w-6" />,
};

export function TilsynsrapportDialog() {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<TilsynType | null>(null);
  const { toast } = useToast();

  async function handleDownload(type: TilsynType) {
    setDownloading(type);
    try {
      const response = await fetch(`/api/hms-handbok/tilsynsrapport?type=${type}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Ukjent feil" }));
        throw new Error(err.error ?? "Kunne ikke generere rapport");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `Tilsynsrapport-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Rapport lastet ned", description: "PDF-filen er klar." });
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <FileText className="h-4 w-4" />
          Tilsynsrapport
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generer tilsynsrapport</DialogTitle>
          <DialogDescription>
            Velg tilsyn. Rapporten tar med kapitlene og registreringene det tilsynet faktisk spør etter.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {TILSYN_TYPES.map((tilsyn) => (
            <button
              key={tilsyn.id}
              onClick={() => handleDownload(tilsyn.id)}
              disabled={downloading !== null}
              className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              <div className="mt-0.5 shrink-0 text-primary">
                {TILSYN_ICONS[tilsyn.id]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tilsyn.label}</span>
                  {downloading === tilsyn.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {tilsyn.description}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  {tilsyn.legalBasis}
                </p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Arbeidstilsynet får internkontrollen. Statens vegvesen får kvalitetsstyringen etter verkstedforskriften §§ 15–18. Det som skal meldes på vegvesen.no, ligger ikke i PDF-en.
        </p>
      </DialogContent>
    </Dialog>
  );
}
