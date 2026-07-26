"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import type { AktivitetsUtstyrssjekk } from "@prisma/client";

const UTST_TYPER: Record<string, string> = {
  KANO: "Kano/kajak", SYKKEL: "Sykkel", SKI: "Ski/snowboard",
  KLATREVEGG: "Klatrevegg", ZIPLINE: "Zipline/tyrolerbane", ANNET: "Annet",
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  OK:     { label: "OK",     color: "text-green-600 bg-green-100" },
  AVVIK:  { label: "Avvik",  color: "text-orange-600 bg-orange-100" },
  KASSERT:{ label: "Kassert",color: "text-red-600 bg-red-100" },
};

interface Props {
  sjekker: AktivitetsUtstyrssjekk[];
  avvikCount: number;
  canEdit: boolean;
}

export function AktivitetssikkerhetClient({ sjekker, avvikCount, canEdit }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ utstyrsType: "KANO", utstyrsNavn: "", checkedBy: "", status: "OK", findings: "" });
  const [saving, setSaving] = useState(false);

  async function submitForm() {
    if (!form.utstyrsNavn) { toast.error("Fyll inn utstyrsnavn"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/aktivitetssikkerhet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, checkDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sjekk registrert");
      setShowForm(false);
      router.refresh();
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aktivitetssikkerhet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Produktkontrolloven § 3 – daglig utstyrssjekk og gjestesikkerhet
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Ny sjekk
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sjekker totalt</p><p className="font-bold text-xl">{sjekker.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avvik åpne</p><p className={`font-bold text-xl ${avvikCount > 0 ? "text-orange-600" : "text-green-600"}`}>{avvikCount}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Kassert utstyr</p><p className="font-bold text-xl text-red-600">{sjekker.filter((s) => s.status === "KASSERT").length}</p></CardContent></Card>
      </div>

      {avvikCount > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-orange-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{avvikCount} utstyrssjekkavvik krever oppfølging</p>
        </div>
      )}

      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Ny utstyrssjekk</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Utstyrstype</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.utstyrsType} onChange={(e) => setForm((p) => ({ ...p, utstyrsType: e.target.value }))}>
                  {Object.entries(UTST_TYPER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Navn/ID *</Label>
                <Input placeholder="Kano nr. 3" value={form.utstyrsNavn} onChange={(e) => setForm((p) => ({ ...p, utstyrsNavn: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sjekket av</Label>
                <Input placeholder="Navn/initialer" value={form.checkedBy} onChange={(e) => setForm((p) => ({ ...p, checkedBy: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="OK">OK</option>
                  <option value="AVVIK">Avvik</option>
                  <option value="KASSERT">Kassert</option>
                </select>
              </div>
            </div>
            {form.status !== "OK" && (
              <div className="space-y-1">
                <Label className="text-xs">Funn / beskrivelse av avvik</Label>
                <Textarea rows={2} value={form.findings} onChange={(e) => setForm((p) => ({ ...p, findings: e.target.value }))} />
              </div>
            )}
            <Button size="sm" disabled={saving} onClick={submitForm}>{saving ? "Lagrer..." : "Registrer"}</Button>
          </CardContent>
        </Card>
      )}

      {sjekker.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">Ingen utstyrssjekker registrert ennå</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b">
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Utstyr</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Type</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Dato</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Av</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Status</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Funn</th>
            </tr></thead>
            <tbody>
              {sjekker.map((s) => {
                const sc = STATUS_CFG[s.status] ?? STATUS_CFG.OK;
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 font-medium">{s.utstyrsNavn}</td>
                    <td className="p-2 text-muted-foreground">{UTST_TYPER[s.utstyrsType] ?? s.utstyrsType}</td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(s.checkDate).toLocaleDateString("nb-NO")}</td>
                    <td className="p-2 text-muted-foreground">{s.checkedBy ?? "–"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{s.findings ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
