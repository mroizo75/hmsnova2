"use client";

/**
 * NAV Yrkesskademelding – forhåndsutfylt skjema fra Incident
 *
 * Hjemmel: Ftrl. § 13-14, AML § 5-2
 * Arbeidsgiver plikter å melde arbeidsulykker og yrkessykdom til NAV.
 * Fristen er straks ved alvorlig ulykke, ellers snarest.
 *
 * Fase 1: Generer utfylt PDF basert på Incident-data (skjema 13-07 / tilsvarende)
 * Fase 2: Direkte API-innsending via NAV Arbeidsgiverportal (Altinn API)
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Send, FileText, Loader2, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface IncidentForNav {
  id: string;
  avviksnummer?: string | null;
  type: string;
  title: string;
  description: string;
  occurredAt: Date | string;
  location?: string | null;
  injuryType?: string | null;
  injuryDescription?: string | null;
  isFatal: boolean;
  isLostTimeIncident: boolean;
  lostWorkdays?: number | null;
  medicalAttentionRequired: boolean;
  witnessName?: string | null;
  immediateAction?: string | null;
  reportedForUserName?: string | null;
}

interface TenantInfo {
  name: string;
  orgNumber?: string | null;
  address?: string | null;
  contactPhone?: string | null;
}

interface NavMeldingDialogProps {
  incident: IncidentForNav;
  tenant: TenantInfo;
}

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ULYKKE: "Arbeidsulykke",
  YRKESSYKDOM: "Yrkessykdom",
  NESTEN: "Nestenulykke",
};

export function NavMeldingDialog({ incident, tenant }: NavMeldingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporterNavn, setEksporterNavn] = useState("");
  const [eksporterTittel, setEksporterTittel] = useState("");
  const [tilleggsInfo, setTilleggsInfo] = useState("");
  const { toast } = useToast();

  const isReportable = incident.type === "ULYKKE" || incident.type === "YRKESSYKDOM";

  async function handleDownloadPdf() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        incidentId: incident.id,
        exporterNavn,
        eksporterTittel,
        tilleggsInfo,
      });
      const res = await fetch(`/api/nav-melding?${params.toString()}`);
      if (!res.ok) throw new Error("Feil ved generering");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NAV-yrkesskademelding-${incident.avviksnummer ?? incident.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF generert", description: "NAV-meldingen er klar for sending." });
      setOpen(false);
    } catch {
      toast({ title: "Feil", description: "Kunne ikke generere PDF. Prøv igjen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!isReportable) return null;

  const occurredDate = format(new Date(incident.occurredAt), "d. MMMM yyyy", { locale: nb });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">
          <Send className="h-4 w-4" />
          Meld til NAV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Yrkesskademelding til NAV
          </DialogTitle>
          <DialogDescription>
            Ftrl. § 13-14: Arbeidsgiver plikter å melde arbeidsulykker og yrkessykdom til NAV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Generer en utfylt PDF basert på avviksdataene. Last ned og send til NAV via{" "}
              <a href="https://www.nav.no/arbeidsgiver/skademelding" target="_blank" rel="noreferrer" className="underline font-medium">
                nav.no/arbeidsgiver/skademelding
              </a>{" "}
              eller Altinn skjema 13-07.
            </AlertDescription>
          </Alert>

          {incident.isFatal && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800 font-medium">
                Dødelig ulykke – meld straks til Arbeidstilsynet (815 48 222) og politiet (AML § 5-2).
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Forhåndsutfylt informasjon */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Forhåndsutfylt fra avviksregistrering
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Hendelsestype</p>
                <Badge variant="outline" className="border-orange-200 text-orange-700">
                  {INCIDENT_TYPE_LABELS[incident.type] ?? incident.type}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Avviksnummer</p>
                <p className="font-medium">{incident.avviksnummer ?? "–"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Dato</p>
                <p className="font-medium">{occurredDate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Sted</p>
                <p className="font-medium">{incident.location ?? "–"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Bedrift</p>
                <p className="font-medium">{tenant.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Org.nr.</p>
                <p className="font-medium">{tenant.orgNumber ?? "–"}</p>
              </div>
              {incident.reportedForUserName && (
                <div className="col-span-2 space-y-1">
                  <p className="text-muted-foreground">Skadelidte</p>
                  <p className="font-medium">{incident.reportedForUserName}</p>
                </div>
              )}
              {incident.injuryType && (
                <div className="col-span-2 space-y-1">
                  <p className="text-muted-foreground">Skadetype</p>
                  <p className="font-medium">{incident.injuryType}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Tilleggsinformasjon for PDF */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Utfyll for PDF
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exporterNavn">Innmelder – navn</Label>
                <Input
                  id="exporterNavn"
                  value={exporterNavn}
                  onChange={(e) => setEksporterNavn(e.target.value)}
                  placeholder="F.eks. Ola Nordmann"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eksporterTittel">Innmelder – tittel/stilling</Label>
                <Input
                  id="eksporterTittel"
                  value={eksporterTittel}
                  onChange={(e) => setEksporterTittel(e.target.value)}
                  placeholder="F.eks. Daglig leder"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tilleggsInfo">Tilleggsinformasjon til NAV (valgfritt)</Label>
              <Textarea
                id="tilleggsInfo"
                value={tilleggsInfo}
                onChange={(e) => setTilleggsInfo(e.target.value)}
                placeholder="Eventuell tilleggsinformasjon som ikke fremgår av avviksregistreringen..."
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <a href="https://www.altinn.no/skjemaoversikt/arbeids--og-velferdsetaten/skademelding-ved-arbeidsulykke/" target="_blank" rel="noreferrer">
              Åpne Altinn direkte
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button onClick={handleDownloadPdf} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Last ned PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
