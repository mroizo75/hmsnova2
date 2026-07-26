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
import { AlertTriangle, Truck, Plus, X, FileText, IdCard } from "lucide-react";
import type { TransportJournal, SjaforDokument, LoyveRegister } from "@prisma/client";

const LOYVE_TYPER: Record<string, string> = {
  RUTELOEYVE: "Ruteløyve", TURVOGN: "Turvogn", GODS: "Godstransport", TURBUSS: "Turbuss",
};

interface Props {
  journaler: TransportJournal[];
  sjaforDokumenter: SjaforDokument[];
  loyveRegister: LoyveRegister[];
  expiringCount: number;
  canEdit: boolean;
}

export function TransportClient({ journaler: initialJournaler, sjaforDokumenter: initialSjafor, loyveRegister: initialLoyve, expiringCount, canEdit }: Props) {
  const router = useRouter();
  const [journaler, setJournaler] = useState(initialJournaler);
  const [sjaforDokumenter, setSjaforDokumenter] = useState(initialSjafor);
  const [loyveRegister, setLoyveRegister] = useState(initialLoyve);
  const [saving, setSaving] = useState(false);

  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journal, setJournal] = useState({
    vehicleReg: "", driverName: "", date: new Date().toISOString().slice(0, 10),
    departureTime: "08:00", arrivalTime: "", routeDesc: "", kmStart: "",
    kmEnd: "", drivingHours: "", breakHours: "", preCheckDone: false, incidents: "",
  });

  const [showSjaforForm, setShowSjaforForm] = useState(false);
  const [sjaforForm, setSjaforForm] = useState({
    driverName: "", driverPhone: "", kompetansebevis: "", kbUtlopDato: "",
    forerkortNr: "", forerkortKlasse: "", forerkortUtlop: "", adrSertifikat: "", adrUtlop: "",
  });

  const [showLoyveForm, setShowLoyveForm] = useState(false);
  const [loyveForm, setLoyveForm] = useState({
    loyveType: "TURVOGN", loyveNummer: "", kjoretoyReg: "", utstedtAv: "", utlopDato: "",
  });

  async function submitJournal() {
    if (!journal.vehicleReg || !journal.driverName) { toast.error("Fyll inn reg.nr og sjåfør"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...journal,
          kmStart: journal.kmStart ? parseFloat(journal.kmStart) : null,
          kmEnd: journal.kmEnd ? parseFloat(journal.kmEnd) : null,
          drivingHours: journal.drivingHours ? parseFloat(journal.drivingHours) : null,
          breakHours: journal.breakHours ? parseFloat(journal.breakHours) : null,
          arrivalTime: journal.arrivalTime || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setJournaler((p) => [data.journal, ...p]);
      toast.success("Kjørejournal registrert");
      setShowJournalForm(false);
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  async function submitSjafor() {
    if (!sjaforForm.driverName) { toast.error("Fyll inn sjåførnavn"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/transport/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sjaforForm,
          kbUtlopDato: sjaforForm.kbUtlopDato ? new Date(sjaforForm.kbUtlopDato).toISOString() : null,
          forerkortUtlop: sjaforForm.forerkortUtlop ? new Date(sjaforForm.forerkortUtlop).toISOString() : null,
          adrUtlop: sjaforForm.adrUtlop ? new Date(sjaforForm.adrUtlop).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setSjaforDokumenter((p) => [...p, data.doc]);
      toast.success("Sjåførdokument lagret");
      setShowSjaforForm(false);
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  async function submitLoyve() {
    if (!loyveForm.loyveNummer) { toast.error("Fyll inn løyvenummer"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/transport/docs?type=loyve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...loyveForm,
          utlopDato: loyveForm.utlopDato ? new Date(loyveForm.utlopDato).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setLoyveRegister((p) => [...p, data.loyve]);
      toast.success("Løyve registrert");
      setShowLoyveForm(false);
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  const now = new Date();
  function isExpiring(date: Date | null) {
    if (!date) return false;
    return new Date(date) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6 text-blue-500" />Transportmodul</h1>
          <p className="text-sm text-muted-foreground mt-1">Yrkestransportlova · Vegtransportloven – kjørejournal, løyve og sjåførdokumentasjon</p>
        </div>
      </div>

      {expiringCount > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-orange-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{expiringCount} sertifikat/løyve utløper innen 60 dager – krev fornyelse</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Kjøreturer</p><p className="font-bold text-xl">{journaler.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sjåfører registrert</p><p className="font-bold text-xl">{sjaforDokumenter.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Løyver aktive</p><p className="font-bold text-xl">{loyveRegister.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal">Kjørejournal</TabsTrigger>
          <TabsTrigger value="sjafor" className="flex items-center gap-1.5">
            <IdCard className="h-3.5 w-3.5" /> Sjåfører
            <Badge variant="outline" className="ml-1 text-xs">{sjaforDokumenter.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="loyve" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Løyver
            <Badge variant="outline" className="ml-1 text-xs">{loyveRegister.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* KJØREJOURNAL */}
        <TabsContent value="journal" className="mt-4 space-y-4">
          {canEdit && <Button size="sm" onClick={() => setShowJournalForm(true)}><Plus className="h-4 w-4 mr-1.5" />Ny kjørejournal</Button>}
          {showJournalForm && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">Ny kjørejournal</p><Button size="icon" variant="ghost" onClick={() => setShowJournalForm(false)}><X className="h-4 w-4" /></Button></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Reg.nr *</Label><Input placeholder="AB 12345" value={journal.vehicleReg} onChange={(e) => setJournal((p) => ({ ...p, vehicleReg: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Sjåfør *</Label><Input value={journal.driverName} onChange={(e) => setJournal((p) => ({ ...p, driverName: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Dato</Label><Input type="date" value={journal.date} onChange={(e) => setJournal((p) => ({ ...p, date: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Avgang</Label><Input type="time" value={journal.departureTime} onChange={(e) => setJournal((p) => ({ ...p, departureTime: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Ankomst</Label><Input type="time" value={journal.arrivalTime} onChange={(e) => setJournal((p) => ({ ...p, arrivalTime: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Rute</Label><Input placeholder="Oslo–Bergen" value={journal.routeDesc} onChange={(e) => setJournal((p) => ({ ...p, routeDesc: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Km start</Label><Input type="number" value={journal.kmStart} onChange={(e) => setJournal((p) => ({ ...p, kmStart: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Km slutt</Label><Input type="number" value={journal.kmEnd} onChange={(e) => setJournal((p) => ({ ...p, kmEnd: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Kjøretimer</Label><Input type="number" step="0.5" value={journal.drivingHours} onChange={(e) => setJournal((p) => ({ ...p, drivingHours: e.target.value }))} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={journal.preCheckDone} onCheckedChange={(v) => setJournal((p) => ({ ...p, preCheckDone: v }))} id="pre-check" />
                  <Label htmlFor="pre-check" className="text-sm">Forhåndskontroll utført</Label>
                </div>
                <Button size="sm" disabled={saving} onClick={submitJournal}>{saving ? "Lagrer..." : "Registrer"}</Button>
              </CardContent>
            </Card>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b"><th className="text-left p-2 text-xs text-muted-foreground font-medium">Reg.nr</th><th className="text-left p-2 text-xs text-muted-foreground font-medium">Sjåfør</th><th className="text-left p-2 text-xs text-muted-foreground font-medium">Dato</th><th className="text-left p-2 text-xs text-muted-foreground font-medium">Rute</th><th className="text-right p-2 text-xs text-muted-foreground font-medium">Km</th><th className="text-left p-2 text-xs text-muted-foreground font-medium">Kontroll</th></tr></thead>
              <tbody>
                {journaler.map((j) => (
                  <tr key={j.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-mono font-medium">{j.vehicleReg}</td>
                    <td className="p-2">{j.driverName}</td>
                    <td className="p-2 text-xs text-muted-foreground">{j.date}</td>
                    <td className="p-2 text-xs text-muted-foreground">{j.routeDesc ?? "–"}</td>
                    <td className="p-2 text-right text-xs">{j.kmStart && j.kmEnd ? Math.round(j.kmEnd - j.kmStart) : "–"}</td>
                    <td className="p-2 text-xs">{j.preCheckDone ? <span className="text-green-600">✓</span> : <span className="text-red-500">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* SJÅFØRER */}
        <TabsContent value="sjafor" className="mt-4 space-y-4">
          {canEdit && <Button size="sm" onClick={() => setShowSjaforForm(true)}><Plus className="h-4 w-4 mr-1.5" />Legg til sjåfør</Button>}
          {showSjaforForm && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">Ny sjåførdokumentasjon</p><Button size="icon" variant="ghost" onClick={() => setShowSjaforForm(false)}><X className="h-4 w-4" /></Button></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2"><Label className="text-xs">Sjåfør navn *</Label><Input value={sjaforForm.driverName} onChange={(e) => setSjaforForm((p) => ({ ...p, driverName: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={sjaforForm.driverPhone} onChange={(e) => setSjaforForm((p) => ({ ...p, driverPhone: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Kompetansebevis nr</Label><Input value={sjaforForm.kompetansebevis} onChange={(e) => setSjaforForm((p) => ({ ...p, kompetansebevis: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">KB utløper</Label><Input type="date" value={sjaforForm.kbUtlopDato} onChange={(e) => setSjaforForm((p) => ({ ...p, kbUtlopDato: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Førerkortklasse</Label><Input placeholder="C, D, CE" value={sjaforForm.forerkortKlasse} onChange={(e) => setSjaforForm((p) => ({ ...p, forerkortKlasse: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Førerkort utløper</Label><Input type="date" value={sjaforForm.forerkortUtlop} onChange={(e) => setSjaforForm((p) => ({ ...p, forerkortUtlop: e.target.value }))} /></div>
                </div>
                <Button size="sm" disabled={saving} onClick={submitSjafor}>{saving ? "Lagrer..." : "Lagre"}</Button>
              </CardContent>
            </Card>
          )}
          {sjaforDokumenter.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <p className="font-medium">{d.driverName}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {d.forerkortKlasse && <Badge variant="outline" className="text-xs">Klasse {d.forerkortKlasse}</Badge>}
                  {d.kompetansebevis && <Badge variant="outline" className="text-xs">KB: {d.kompetansebevis}</Badge>}
                  {d.kbUtlopDato && <span className={`text-xs px-2 py-0.5 rounded-full ${isExpiring(d.kbUtlopDato) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>KB utløper {new Date(d.kbUtlopDato).toLocaleDateString("nb-NO")}</span>}
                  {d.forerkortUtlop && <span className={`text-xs px-2 py-0.5 rounded-full ${isExpiring(d.forerkortUtlop) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>FK utløper {new Date(d.forerkortUtlop).toLocaleDateString("nb-NO")}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* LØYVER */}
        <TabsContent value="loyve" className="mt-4 space-y-4">
          {canEdit && <Button size="sm" onClick={() => setShowLoyveForm(true)}><Plus className="h-4 w-4 mr-1.5" />Registrer løyve</Button>}
          {showLoyveForm && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">Nytt løyve</p><Button size="icon" variant="ghost" onClick={() => setShowLoyveForm(false)}><X className="h-4 w-4" /></Button></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Type</Label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={loyveForm.loyveType} onChange={(e) => setLoyveForm((p) => ({ ...p, loyveType: e.target.value }))}>
                      {Object.entries(LOYVE_TYPER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Løyvenummer *</Label><Input value={loyveForm.loyveNummer} onChange={(e) => setLoyveForm((p) => ({ ...p, loyveNummer: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Tilknyttet kjøretøy</Label><Input placeholder="AB 12345" value={loyveForm.kjoretoyReg} onChange={(e) => setLoyveForm((p) => ({ ...p, kjoretoyReg: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Utstedt av</Label><Input placeholder="Statsforvalteren" value={loyveForm.utstedtAv} onChange={(e) => setLoyveForm((p) => ({ ...p, utstedtAv: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Utløpsdato</Label><Input type="date" value={loyveForm.utlopDato} onChange={(e) => setLoyveForm((p) => ({ ...p, utlopDato: e.target.value }))} /></div>
                </div>
                <Button size="sm" disabled={saving} onClick={submitLoyve}>{saving ? "Lagrer..." : "Registrer"}</Button>
              </CardContent>
            </Card>
          )}
          {loyveRegister.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{LOYVE_TYPER[l.loyveType] ?? l.loyveType} – {l.loyveNummer}</p>
                  <p className="text-xs text-muted-foreground">{l.kjoretoyReg ? `Kjøretøy: ${l.kjoretoyReg}` : ""} {l.utstedtAv ? `· ${l.utstedtAv}` : ""}</p>
                </div>
                {l.utlopDato && <span className={`text-xs px-2 py-0.5 rounded-full ${isExpiring(l.utlopDato) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>Utløper {new Date(l.utlopDato).toLocaleDateString("nb-NO")}</span>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
