"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Shield,
  Users,
  MapPin,
  Phone,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";
import type { GjesteHendelse, HotellEvakueringsplan } from "@prisma/client";

const HENDELSE_TYPER: Record<string, { label: string; color: string }> = {
  SKADE_PA_GJEST:       { label: "Skade på gjest",         color: "bg-red-100 text-red-700 border-red-200" },
  SAVNET_GJEST:         { label: "Savnet gjest",           color: "bg-orange-100 text-orange-700 border-orange-200" },
  MEDISINSK_NODSITUASJON: { label: "Medisinsk nødsituasjon", color: "bg-red-100 text-red-700 border-red-200" },
  BRANN:                { label: "Brann",                  color: "bg-red-100 text-red-700 border-red-200" },
  MATFORGIFTNING:       { label: "Matforgiftning",         color: "bg-orange-100 text-orange-700 border-orange-200" },
  ANNET:                { label: "Annet",                  color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const ALVORLIGHET: Record<string, { label: string; color: string }> = {
  INGEN:      { label: "Ingen skade",   color: "text-green-600" },
  LETT:       { label: "Lett skade",    color: "text-yellow-600" },
  ALVORLIG:   { label: "Alvorlig",      color: "text-orange-600" },
  LIVSTRUENDE:{ label: "Livstruende",   color: "text-red-600" },
};

interface Props {
  hendelser: GjesteHendelse[];
  evakueringsplaner: HotellEvakueringsplan[];
  canEdit: boolean;
}

export function BeredskapReiselivClient({ hendelser, evakueringsplaner, canEdit }: Props) {
  const router = useRouter();
  const [showNyHendelse, setShowNyHendelse] = useState(false);
  const [hendelsForm, setHendelsForm] = useState({
    type: "ANNET",
    description: "",
    location: "",
    guestName: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    injurySeverity: "INGEN",
  });
  const [saving, setSaving] = useState(false);

  const openHendelser = hendelser.filter((h) => h.status !== "LUKKET");

  async function createHendelse() {
    if (!hendelsForm.description) { toast.error("Beskrivelse er påkrevd"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/beredskap/gjeste-hendelse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hendelsForm,
          occurredAt: new Date(hendelsForm.occurredAt).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Feil");
      toast.success("Hendelse registrert");
      setShowNyHendelse(false);
      router.refresh();
    } catch { toast.error("Feil ved registrering"); }
    finally { setSaving(false); }
  }

  async function closeHendelse(id: string) {
    try {
      const res = await fetch(`/api/beredskap/gjeste-hendelse/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LUKKET" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hendelse lukket");
      router.refresh();
    } catch { toast.error("Feil"); }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          Beredskap – Reiseliv
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          AML § 4-2, Pakkereiseloven § 14, IK-HMS § 5 – gjestehendelser og evakuering
        </p>
      </div>

      {/* Hurtigstatus */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Åpne hendelser</p>
            <p className={`font-bold text-xl ${openHendelser.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {openHendelser.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Totalt registrert</p>
            <p className="font-bold text-xl">{hendelser.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Evakueringsplaner</p>
            <p className="font-bold text-xl">{evakueringsplaner.length}</p>
          </CardContent>
        </Card>
      </div>

      {openHendelser.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{openHendelser.length} åpne gjestehendelse(r) krever oppfølging</p>
        </div>
      )}

      <Tabs defaultValue="hendelser">
        <TabsList>
          <TabsTrigger value="hendelser" className="relative">
            Gjestehendelser
            {openHendelser.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 text-white text-[10px] px-1.5">{openHendelser.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="evakuering">Evakueringsplan</TabsTrigger>
          <TabsTrigger value="maler">Krisekommunikasjon</TabsTrigger>
        </TabsList>

        {/* GJESTEHENDELSER */}
        <TabsContent value="hendelser" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Gjestehendelser</h2>
              <p className="text-xs text-muted-foreground">AML § 5-2, Produktkontrolloven § 5 – registrering og oppfølging</p>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowNyHendelse(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Ny hendelse
              </Button>
            )}
          </div>

          {showNyHendelse && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-red-800">Registrer gjestehendelse</CardTitle>
                  <Button size="icon" variant="ghost" onClick={() => setShowNyHendelse(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type *</Label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={hendelsForm.type} onChange={(e) => setHendelsForm((p) => ({ ...p, type: e.target.value }))}>
                      {Object.entries(HENDELSE_TYPER).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Alvorlighetsgrad</Label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={hendelsForm.injurySeverity} onChange={(e) => setHendelsForm((p) => ({ ...p, injurySeverity: e.target.value }))}>
                      {Object.entries(ALVORLIGHET).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tidspunkt *</Label>
                    <Input type="datetime-local" value={hendelsForm.occurredAt}
                      onChange={(e) => setHendelsForm((p) => ({ ...p, occurredAt: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sted</Label>
                    <Input placeholder="Rom 204, restaurant, lobby..." value={hendelsForm.location}
                      onChange={(e) => setHendelsForm((p) => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Gjestens navn</Label>
                    <Input placeholder="Valgfritt" value={hendelsForm.guestName}
                      onChange={(e) => setHendelsForm((p) => ({ ...p, guestName: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Beskrivelse *</Label>
                  <Textarea placeholder="Beskriv hendelsen..." rows={3} value={hendelsForm.description}
                    onChange={(e) => setHendelsForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <Button size="sm" disabled={saving} onClick={createHendelse}>
                  {saving ? "Lagrer..." : "Registrer hendelse"}
                </Button>
              </CardContent>
            </Card>
          )}

          {hendelser.length === 0 && !showNyHendelse ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <Shield className="h-8 w-8 opacity-30" />
                <p className="text-sm">Ingen gjestehendelser registrert</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hendelser.map((h) => {
                const typeCfg = HENDELSE_TYPER[h.type] ?? HENDELSE_TYPER.ANNET;
                const alvCfg = h.injurySeverity ? ALVORLIGHET[h.injurySeverity] : null;
                return (
                  <Card key={h.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={typeCfg.color}>{typeCfg.label}</Badge>
                          {alvCfg && <span className={`text-xs font-medium ${alvCfg.color}`}>{alvCfg.label}</span>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.occurredAt).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <Badge variant={h.status === "LUKKET" ? "outline" : h.status === "UNDER_BEHANDLING" ? "secondary" : "destructive"}>
                          {h.status === "LUKKET" ? "Lukket" : h.status === "UNDER_BEHANDLING" ? "Under behandling" : "Åpen"}
                        </Badge>
                      </div>
                      <p className="text-sm">{h.description}</p>
                      {(h.guestName || h.location) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {h.guestName && <span><Users className="inline h-3 w-3 mr-1" />{h.guestName}</span>}
                          {h.location && <span><MapPin className="inline h-3 w-3 mr-1" />{h.location}</span>}
                        </p>
                      )}
                      {canEdit && h.status !== "LUKKET" && (
                        <Button size="sm" variant="outline" onClick={() => closeHendelse(h.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Lukk hendelse
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* EVAKUERINGSPLAN */}
        <TabsContent value="evakuering" className="mt-4 space-y-4">
          <div>
            <h2 className="font-semibold">Hotell-evakueringsplan</h2>
            <p className="text-xs text-muted-foreground">AML § 4-2, DSB Brannvernforskriften – etasjeansvarlige og samlingspunkt</p>
          </div>

          {evakueringsplaner.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <MapPin className="h-8 w-8 opacity-30" />
                <p className="text-sm">Ingen evakueringsplan opprettet</p>
                {canEdit && (
                  <Button size="sm" onClick={async () => {
                    try {
                      const res = await fetch("/api/beredskap/hotell-evakuering", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ planName: "Evakueringsplan – " + new Date().getFullYear() }),
                      });
                      if (!res.ok) throw new Error();
                      toast.success("Plan opprettet");
                      router.refresh();
                    } catch { toast.error("Feil"); }
                  }}>
                    <Plus className="h-4 w-4 mr-1.5" /> Opprett evakueringsplan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {evakueringsplaner.map((plan) => (
                <Card key={plan.id}>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold">{plan.planName}</h3>
                    {plan.buildingName && <p className="text-xs text-muted-foreground">{plan.buildingName}</p>}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {plan.totalFloors > 0 && <span>{plan.totalFloors} etasjer</span>}
                      {plan.maxOccupancy && <span>Maks {plan.maxOccupancy} gjester</span>}
                      {plan.assemblyPoint && <span><MapPin className="inline h-3 w-3 mr-0.5" />{plan.assemblyPoint}</span>}
                      {plan.fireWarden && <span><Users className="inline h-3 w-3 mr-0.5" />Brannvernansvarlig: {plan.fireWarden}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* KRISEKOMMUNIKASJONS-MALER */}
        <TabsContent value="maler" className="mt-4 space-y-4">
          <div>
            <h2 className="font-semibold">Krisekommunikasjonsmaler</h2>
            <p className="text-xs text-muted-foreground">Pakkereiseloven § 14 – informasjonsplikt ved avvik/kriser</p>
          </div>
          <div className="space-y-3">
            {[
              {
                title: "Mal: Melding til pårørende ved alvorlig personskade",
                content: `Vi beklager å informere om at [GJESTENAVN] fikk en alvorlig skade [DATO] under opphold hos oss. Vedkommende ble umiddelbart tatt hånd om av [LEGE/AMBULANSE] og ble fraktet til [SYKEHUS]. Vi holder dere løpende informert og kan kontaktes på [TELEFON/E-POST] ved spørsmål.`,
              },
              {
                title: "Mal: Pressemelding – hendelse ved virksomheten",
                content: `[VIRKSOMHETSNAVN] bekrefter at det [DATO] inntraff [KORT BESKRIVELSE AV HENDELSEN] ved vårt anlegg. Sikkerheten til våre gjester og ansatte er vår høyeste prioritet. Vi samarbeider med [POLITI/REDNINGSTJENESTE/MATTILSYNET] om hendelsen. Ytterligere informasjon vil bli gitt så snart vi vet mer.`,
              },
              {
                title: "Mal: Melding til forsikringsselskap",
                content: `Vi melder herved skadehendelse: Policynummer [NR], Hendelsesdato [DATO], Hendelsessted [STED], Beskrivelse [BESKRIV HENDELSEN], Berørte parter [NAVN], Anslått tap [BELØP]. Kontaktperson: [NAVN, TELEFON, E-POST].`,
              },
              {
                title: "Mal: Intern krisehåndteringsplan – turoperatør",
                content: `1. STRAKS: Sikre liv og helse – tilkall hjelp (113/112/110). 2. REGISTRER: Dato, tid, sted, involverte. 3. VARSLE: Daglig leder, nødetater, pårørende. 4. DOKUMENTER: Foto, vitner, hendelsesrapport. 5. RAPPORTER: Mattilsynet ved mistanke om matforgiftning (matloven § 6 og IK-mat § 5 nr. 4), Pakkereiseloven ved reisehendelse. 6. FØLG OPP: Tilbud om støtte til berørte, intern evaluering.`,
              },
            ].map((m, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-medium text-sm">{m.title}</h3>
                  <pre className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap font-sans">
                    {m.content}
                  </pre>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(m.content);
                    toast.success("Mal kopiert!");
                  }}>
                    Kopier mal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
