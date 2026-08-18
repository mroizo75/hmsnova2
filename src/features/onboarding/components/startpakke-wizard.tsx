"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Hotel,
  UtensilsCrossed,
  Mountain,
  Bus,
  Building2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  BookOpen,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  GraduationCap,
  FileText,
  X,
  Hammer,
  Zap,
  Anchor,
  Ship,
  Fuel,
  Fish,
  Pickaxe,
  Heart,
  School,
  Factory,
  ShoppingCart,
  Tractor,
  Monitor,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { completeStartpakkeSetup, skipStartpakke } from "@/server/actions/onboarding.actions";
import { BRANSJE_MODULES } from "@/lib/bransje-modules";

type Bransje = string;

const BRANSJE_OPTIONS: { id: string; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "construction", label: "Bygg og anlegg", description: "Byggeplasser, entreprenører, håndverkere og anleggsarbeid", icon: <Hammer className="h-6 w-6" /> },
  { id: "elektro", label: "Elektro og energi", description: "Elektrisk installasjon, energiselskap og nettselskap", icon: <Zap className="h-6 w-6" /> },
  { id: "offshore", label: "Offshore og petroleum", description: "Offshore-installasjoner, rigg og vedlikehold", icon: <Anchor className="h-6 w-6" /> },
  { id: "marine", label: "Maritim og sjøfart", description: "Skip, verft, havnevirksomhet og maritim service", icon: <Ship className="h-6 w-6" /> },
  { id: "oil_gas", label: "Olje og gass", description: "Raffineri, petrokjemi og gassanlegg", icon: <Fuel className="h-6 w-6" /> },
  { id: "fiskeri", label: "Fiskeri og havbruk", description: "Fiske, oppdrett, foredling og havbruk", icon: <Fish className="h-6 w-6" /> },
  { id: "bergverk", label: "Bergverk og gruvedrift", description: "Gruver, steinbrudd, pukkverk og mineralutvinning", icon: <Pickaxe className="h-6 w-6" /> },
  { id: "healthcare", label: "Helse og omsorg", description: "Sykehus, legekontor, sykehjem, hjemmetjeneste og omsorg", icon: <Heart className="h-6 w-6" /> },
  { id: "education", label: "Utdanning", description: "Barnehager, skoler, høyskoler og universiteter", icon: <School className="h-6 w-6" /> },
  { id: "hospitality", label: "Hotell og restaurant", description: "Hoteller, restauranter, kafeer, catering og kantine", icon: <Hotel className="h-6 w-6" /> },
  { id: "aktivitet", label: "Aktivitet og opplevelse", description: "Aktivitetsparker, guider, sport og friluftsliv", icon: <Mountain className="h-6 w-6" /> },
  { id: "transport", label: "Transport og logistikk", description: "Busser, båter, taxier, gods og reisearrangører", icon: <Bus className="h-6 w-6" /> },
  { id: "manufacturing", label: "Industri og produksjon", description: "Fabrikker, produksjonsanlegg og verksted", icon: <Factory className="h-6 w-6" /> },
  { id: "retail", label: "Handel og service", description: "Butikker, kjeder, service og kundebehandling", icon: <ShoppingCart className="h-6 w-6" /> },
  { id: "agriculture", label: "Landbruk", description: "Gårdsdrift, skogbruk, dyrehold og planteproduksjon", icon: <Tractor className="h-6 w-6" /> },
  { id: "technology", label: "Teknologi og IT", description: "Programvare, IT-drift, konsulentvirksomhet og kontor", icon: <Monitor className="h-6 w-6" /> },
  { id: "other", label: "Annen bransje", description: "Øvrige virksomheter – standard HMS-moduler aktiveres", icon: <Building2 className="h-6 w-6" /> },
];

const MODULE_ICONS: Record<string, React.ReactNode> = {
  "/dashboard/hms-handbok": <BookOpen className="h-4 w-4" />,
  "/dashboard/incidents": <AlertTriangle className="h-4 w-4" />,
  "/dashboard/risks": <ShieldCheck className="h-4 w-4" />,
  "/dashboard/rutiner": <ClipboardList className="h-4 w-4" />,
  "/dashboard/training": <GraduationCap className="h-4 w-4" />,
  "/dashboard/inspections": <FileText className="h-4 w-4" />,
};

const MODULE_LABELS: Record<string, string> = {
  "/dashboard/hms-handbok": "HMS Håndbok",
  "/dashboard/incidents": "Avvik og hendelser",
  "/dashboard/risks": "Risikovurderinger",
  "/dashboard/rutiner": "Rutiner og prosedyrer",
  "/dashboard/training": "Kompetanse og opplæring",
  "/dashboard/inspections": "Vernerunde",
  "/dashboard/fire-drills": "Brannøvelser",
  "/dashboard/chemicals": "Stoffkartotek",
  "/dashboard/ik-mat": "IK-mat og HACCP",
  "/dashboard/sja": "SJA",
  "/dashboard/aktivitetssikkerhet": "Aktivitetssikkerhet",
  "/dashboard/transport": "Transport",
  "/dashboard/bht-nattarbeid": "BHT og nattarbeid",
  "/dashboard/annual-hms-plan": "Årlig HMS-plan",
  "/dashboard/settings": "Innstillinger",
};

const CORE_MODULES = [
  "/dashboard/hms-handbok",
  "/dashboard/incidents",
  "/dashboard/risks",
  "/dashboard/rutiner",
  "/dashboard/training",
  "/dashboard/inspections",
];

interface StartpakkeWizardProps {
  tenantId: string;
  tenantName: string;
}

export function StartpakkeWizard({ tenantId, tenantName }: StartpakkeWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedBransje, setSelectedBransje] = useState<Bransje | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleComplete() {
    if (!selectedBransje) return;
    setLoading(true);
    const result = await completeStartpakkeSetup({ tenantId, bransje: selectedBransje });
    setLoading(false);
    if (result.success) {
      toast({ title: "Oppsett fullført!", description: "HMS-systemet ditt er klart til bruk." });
      router.push("/dashboard/hms-handbok");
      router.refresh();
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  async function handleSkip() {
    setSkipping(true);
    await skipStartpakke(tenantId);
    setSkipping(false);
    router.push("/dashboard");
    router.refresh();
  }

  const activeModules = selectedBransje ? BRANSJE_MODULES[selectedBransje]?.modules ?? [] : [];

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo + progress */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg">
              H
            </div>
            <span className="text-xl font-bold">HMS Nova</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className={step === 1 ? "text-primary font-medium" : ""}>1. Velg bransje</span>
            <ChevronRight className="h-3 w-3" />
            <span className={step === 2 ? "text-primary font-medium" : ""}>2. Bekreft oppsett</span>
          </div>
        </div>

        {/* Steg 1: Bransjevalg */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Hva slags virksomhet driver du?</CardTitle>
              <CardDescription>
                Velg bransje slik at vi kan vise de mest relevante HMS-modulene for deg.
                Du kan endre dette når som helst i innstillingene.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {BRANSJE_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBransje(b.id)}
                  className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedBransje === b.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    selectedBransje === b.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {b.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{b.label}</p>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                  </div>
                  {selectedBransje === b.id && (
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                  )}
                </button>
              ))}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleSkip} disabled={skipping} className="text-muted-foreground gap-1.5">
                  {skipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Hopp over
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedBransje}
                  className="gap-2"
                >
                  Neste
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steg 2: Bekreft */}
        {step === 2 && selectedBransje && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Din startpakke er klar</CardTitle>
              <CardDescription>
                Disse modulene aktiveres i menyen for{" "}
                <strong>{BRANSJE_OPTIONS.find((b) => b.id === selectedBransje)?.label}</strong>.
                Alt innhold starter tomt – du fyller inn risikovurderinger, rutiner og mer selv.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Kjernemoduler */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Kjernemoduler
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {activeModules
                    .filter((m) => CORE_MODULES.includes(m))
                    .map((m) => (
                      <div key={m} className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                        <span className="text-primary">
                          {MODULE_ICONS[m] ?? <Check className="h-4 w-4" />}
                        </span>
                        <span className="text-sm font-medium">{MODULE_LABELS[m] ?? m}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Bransje-spesifikke */}
              {activeModules.filter((m) => !CORE_MODULES.includes(m) && m !== "/dashboard/settings" && m !== "/dashboard/annual-hms-plan").length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Bransje-moduler
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeModules
                      .filter((m) => !CORE_MODULES.includes(m) && m !== "/dashboard/settings" && m !== "/dashboard/annual-hms-plan")
                      .map((m) => (
                        <div key={m} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                          <span className="text-muted-foreground">
                            {MODULE_ICONS[m] ?? <Check className="h-4 w-4" />}
                          </span>
                          <span className="text-sm">{MODULE_LABELS[m] ?? m}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                Andre moduler (revisjon, ISO-rapporter, benchmark m.m.) er tilgjengelige i innstillinger
                når du er klar for mer.
              </p>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Tilbake
                </Button>
                <Button onClick={handleComplete} disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Start HMS Nova
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {tenantName} · HMS Nova sikrer at du oppfyller kravene i IK-HMS og Arbeidsmiljøloven
        </p>
      </div>
    </div>
  );
}
