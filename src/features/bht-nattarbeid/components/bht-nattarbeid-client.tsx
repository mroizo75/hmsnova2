"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, Moon, Plus, X, CheckCircle2 } from "lucide-react";
import type { BhtAvtale, NattarbeidVurdering } from "@prisma/client";

interface Props {
  avtaler: BhtAvtale[];
  vurderinger: NattarbeidVurdering[];
  bhtExpired: boolean;
  canEdit: boolean;
}

export function BhtNattarbeidClient({ avtaler: initialAvtaler, vurderinger: initialVurderinger, bhtExpired, canEdit }: Props) {
  const router = useRouter();
  const [avtaler, setAvtaler] = useState(initialAvtaler);
  const [vurderinger, setVurderinger] = useState(initialVurderinger);
  const [showBhtForm, setShowBhtForm] = useState(false);
  const [showNattForm, setShowNattForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bhtForm, setBhtForm] = useState({
    leverandorNavn: "", leverandorOrgnr: "", kontaktperson: "", kontaktTelefon: "", kontaktEpost: "",
    startDato: new Date().toISOString().slice(0, 10),
    sluttDato: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    arsTimeverk: "", naringskode: "", bransjeKrav: "", notat: "",
  });

  const [nattForm, setNattForm] = useState({
    stillingNavn: "", begrunnelse: "", alternativVurd: "",
    helseVurdering: false, samRadVo: false, godkjentAv: "",
    gyldigTil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  async function submitBht() {
    if (!bhtForm.leverandorNavn) { toast.error("Fyll inn BHT-leverandør"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/bht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bhtForm,
          startDato: new Date(bhtForm.startDato).toISOString(),
          sluttDato: bhtForm.sluttDato ? new Date(bhtForm.sluttDato).toISOString() : null,
          arsTimeverk: bhtForm.arsTimeverk ? parseInt(bhtForm.arsTimeverk) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setAvtaler((p) => [data.avtale, ...p]);
      toast.success("BHT-avtale registrert");
      setShowBhtForm(false);
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  async function submitNatt() {
    if (!nattForm.stillingNavn || !nattForm.begrunnelse) { toast.error("Fyll inn stilling og begrunnelse"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/nattarbeid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nattForm,
          gyldigTil: nattForm.gyldigTil ? new Date(nattForm.gyldigTil).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setVurderinger((p) => [data.vurdering, ...p]);
      toast.success("Nattarbeidsvurdering lagret");
      setShowNattForm(false);
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  const activeAvtale = avtaler.find((a) => a.isActive);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-500" />
          BHT og nattarbeid
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AML § 3-3 (BHT-plikt, kode 55.1/56.1) · AML § 10-11 (nattarbeidsvurdering)
        </p>
      </div>

      {bhtExpired && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">BHT-avtalen er utløpt!</p>
            <p className="text-xs">Hotell- og restaurantbransjen er lovpålagt BHT-tilknytning (kode 55.1/56.1). Registrer ny avtale.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="bht">
        <TabsList>
          <TabsTrigger value="bht" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> BHT-avtale
            {!activeAvtale && <span className="ml-1 h-2 w-2 bg-orange-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="nattarbeid" className="flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5" /> Nattarbeid
            <Badge variant="outline" className="ml-1 text-xs">{vurderinger.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* BHT-FANE */}
        <TabsContent value="bht" className="mt-4 space-y-4">
          {activeAvtale ? (
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-green-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Aktiv BHT-avtale
                    </p>
                    <p className="text-sm font-medium mt-1">{activeAvtale.leverandorNavn}</p>
                    {activeAvtale.kontaktperson && <p className="text-xs text-muted-foreground">{activeAvtale.kontaktperson} · {activeAvtale.kontaktTelefon}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Gyldig: {new Date(activeAvtale.startDato).toLocaleDateString("nb-NO")}
                      {activeAvtale.sluttDato ? ` – ${new Date(activeAvtale.sluttDato).toLocaleDateString("nb-NO")}` : " (løpende)"}
                    </p>
                    {activeAvtale.arsTimeverk && <p className="text-xs text-muted-foreground">{activeAvtale.arsTimeverk} timer per år</p>}
                    {activeAvtale.naringskode && <p className="text-xs text-muted-foreground">Næringskode: {activeAvtale.naringskode}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-orange-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Ingen aktiv BHT-avtale registrert</p>
            </div>
          )}

          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowBhtForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> {activeAvtale ? "Registrer ny BHT-avtale" : "Legg til BHT-avtale"}
            </Button>
          )}

          {showBhtForm && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Ny BHT-avtale</p>
                  <Button size="icon" variant="ghost" onClick={() => setShowBhtForm(false)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2"><Label className="text-xs">BHT-leverandør *</Label><Input placeholder="f.eks. Stamina helse AS" value={bhtForm.leverandorNavn} onChange={(e) => setBhtForm((p) => ({ ...p, leverandorNavn: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Org.nr</Label><Input placeholder="123 456 789" value={bhtForm.leverandorOrgnr} onChange={(e) => setBhtForm((p) => ({ ...p, leverandorOrgnr: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Næringskode</Label><Input placeholder="55.1 / 56.1" value={bhtForm.naringskode} onChange={(e) => setBhtForm((p) => ({ ...p, naringskode: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Kontaktperson</Label><Input value={bhtForm.kontaktperson} onChange={(e) => setBhtForm((p) => ({ ...p, kontaktperson: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={bhtForm.kontaktTelefon} onChange={(e) => setBhtForm((p) => ({ ...p, kontaktTelefon: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Startdato</Label><Input type="date" value={bhtForm.startDato} onChange={(e) => setBhtForm((p) => ({ ...p, startDato: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Sluttdato</Label><Input type="date" value={bhtForm.sluttDato} onChange={(e) => setBhtForm((p) => ({ ...p, sluttDato: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Timer per år</Label><Input type="number" placeholder="25" value={bhtForm.arsTimeverk} onChange={(e) => setBhtForm((p) => ({ ...p, arsTimeverk: e.target.value }))} /></div>
                </div>
                <Button size="sm" disabled={saving} onClick={submitBht}>{saving ? "Lagrer..." : "Registrer BHT-avtale"}</Button>
              </CardContent>
            </Card>
          )}

          {avtaler.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Historikk</p>
              <div className="space-y-1">
                {avtaler.slice(1).map((a) => (
                  <div key={a.id} className="text-xs text-muted-foreground border rounded px-3 py-1.5">
                    {a.leverandorNavn} · {new Date(a.startDato).toLocaleDateString("nb-NO")}
                    {a.sluttDato ? ` – ${new Date(a.sluttDato).toLocaleDateString("nb-NO")}` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* NATTARBEID-FANE */}
        <TabsContent value="nattarbeid" className="mt-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">AML § 10-11 – nattarbeid (kl. 21–06)</p>
            <p>Arbeid mellom kl. 21.00 og 06.00 er nattarbeid. Nattarbeid er tillatt der det er nødvendig, men arbeidsgiveren skal dokumentere nødvendigheten og vurdere alternativer. Helsevurdering og drøfting med verneombud anbefales.</p>
          </div>

          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowNattForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Ny nattarbeidsvurdering
            </Button>
          )}

          {showNattForm && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Ny nattarbeidsvurdering</p>
                  <Button size="icon" variant="ghost" onClick={() => setShowNattForm(false)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Stilling / avdeling *</Label><Input placeholder="f.eks. Nattresepsjonist, Kjøkkenansatt vakt" value={nattForm.stillingNavn} onChange={(e) => setNattForm((p) => ({ ...p, stillingNavn: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Begrunnelse for nattarbeid * (lovpåkrevd)</Label><Textarea rows={3} placeholder="Beskriv nødvendigheten av nattarbeid for denne stillingen..." value={nattForm.begrunnelse} onChange={(e) => setNattForm((p) => ({ ...p, begrunnelse: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Vurdering av alternativer</Label><Textarea rows={2} placeholder="Er det vurdert alternativer til nattarbeid? Hvilke?" value={nattForm.alternativVurd} onChange={(e) => setNattForm((p) => ({ ...p, alternativVurd: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Godkjent av</Label><Input value={nattForm.godkjentAv} onChange={(e) => setNattForm((p) => ({ ...p, godkjentAv: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Gyldig til</Label><Input type="date" value={nattForm.gyldigTil} onChange={(e) => setNattForm((p) => ({ ...p, gyldigTil: e.target.value }))} /></div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><Switch id="helse" checked={nattForm.helseVurdering} onCheckedChange={(v) => setNattForm((p) => ({ ...p, helseVurdering: v }))} /><Label htmlFor="helse" className="text-sm">Helsevurdering gjennomført</Label></div>
                    <div className="flex items-center gap-2"><Switch id="vo" checked={nattForm.samRadVo} onCheckedChange={(v) => setNattForm((p) => ({ ...p, samRadVo: v }))} /><Label htmlFor="vo" className="text-sm">Drøftet med verneombud</Label></div>
                  </div>
                </div>
                <Button size="sm" disabled={saving} onClick={submitNatt}>{saving ? "Lagrer..." : "Lagre vurdering"}</Button>
              </CardContent>
            </Card>
          )}

          {vurderinger.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Moon className="h-8 w-8 opacity-30" />
              <p className="text-sm">Ingen nattarbeidsvurderinger registrert</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {vurderinger.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{v.stillingNavn}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.begrunnelse.slice(0, 120)}{v.begrunnelse.length > 120 ? "..." : ""}</p>
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${v.helseVurdering ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {v.helseVurdering ? "✓" : "✗"} Helse
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${v.samRadVo ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {v.samRadVo ? "✓" : "✗"} Verneombud
                          </span>
                          {v.gyldigTil && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(v.gyldigTil) < new Date() ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                              Gyldig t.o.m. {new Date(v.gyldigTil).toLocaleDateString("nb-NO")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
