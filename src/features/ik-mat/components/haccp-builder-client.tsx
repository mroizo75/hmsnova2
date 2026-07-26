"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ChevronDown, ChevronUp, CheckCircle2, Trash2, Edit2 } from "lucide-react";
import type { HaccpPlan, HaccpCcp } from "@prisma/client";

const HAZARD_TYPES: Record<string, string> = {
  BIOLOGISK: "Biologisk", KJEMISK: "Kjemisk", FYSISK: "Fysisk",
};

type PlanWithCcp = HaccpPlan & { ccp: HaccpCcp[] };

interface Props { planer: PlanWithCcp[]; canEdit: boolean; }

export function HaccpBuilderClient({ planer: initial, canEdit }: Props) {
  const router = useRouter();
  const [planer, setPlaner] = useState<PlanWithCcp[]>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(initial[0]?.id ?? null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function createPlan() {
    if (!newTitle.trim()) { toast.error("Fyll inn tittel"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ik-mat/haccp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setPlaner((p) => [data.plan, ...p]);
      setExpandedId(data.plan.id);
      setNewTitle("");
      setShowNewPlan(false);
      toast.success("HACCP-plan opprettet");
    } catch { toast.error("Feil ved oppretting"); }
    finally { setSaving(false); }
  }

  async function deletePlan(id: string) {
    if (!confirm("Slette denne HACCP-planen?")) return;
    try {
      await fetch(`/api/ik-mat/haccp/${id}`, { method: "DELETE" });
      setPlaner((p) => p.filter((x) => x.id !== id));
      toast.success("Slettet");
    } catch { toast.error("Feil"); }
  }

  async function saveCcp(planId: string, ccp: Omit<HaccpCcp, "id" | "planId">[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/ik-mat/haccp/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ccp }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setPlaner((p) => p.map((x) => x.id === planId ? data.plan : x));
      toast.success("CCP-punkt lagret");
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">HACCP Fareanalyse</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Forordning (EF) 852/2004 Art. 5 – Fareanalyse og kritiske kontrollpunkter (CCP)
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowNewPlan(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Ny HACCP-plan
          </Button>
        )}
      </div>

      {showNewPlan && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Plantittel *</Label>
              <Input placeholder="f.eks. HACCP – Varm mat, linje 1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={createPlan}>{saving ? "Oppretter..." : "Opprett"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewPlan(false)}>Avbryt</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {planer.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">Ingen HACCP-planer opprettet ennå</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {planer.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              onToggle={() => setExpandedId((p) => p === plan.id ? null : plan.id)}
              onDelete={() => deletePlan(plan.id)}
              onSaveCcp={(ccp) => saveCcp(plan.id, ccp)}
              canEdit={canEdit}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: PlanWithCcp;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSaveCcp: (ccp: any[]) => void;
  canEdit: boolean;
  saving: boolean;
}

function PlanCard({ plan, expanded, onToggle, onDelete, onSaveCcp, canEdit, saving }: PlanCardProps) {
  const [editingCcp, setEditingCcp] = useState<number | null>(null);
  const [ccpList, setCcpList] = useState<HaccpCcp[]>(plan.ccp);
  const emptyRow = { stepName: "", hazardDesc: "", hazardType: "BIOLOGISK" as const, criticalLimit: "", monitorMethod: "", monitorFreq: "", corrAction: "", verifyMethod: "", recordRequired: "", order: 0 };
  const [newRow, setNewRow] = useState({ ...emptyRow });
  const [showAdd, setShowAdd] = useState(false);

  function addRow() {
    const added = { ...newRow, order: ccpList.length, id: `tmp-${Date.now()}`, planId: plan.id } as HaccpCcp;
    const updated = [...ccpList, added];
    setCcpList(updated);
    onSaveCcp(updated.map(({ ...c }) => c));
    setNewRow({ ...emptyRow });
    setShowAdd(false);
  }

  function removeRow(idx: number) {
    const updated = ccpList.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i }));
    setCcpList(updated);
    onSaveCcp(updated);
  }

  return (
    <Card>
      <CardHeader className="pb-0 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            <CardTitle className="text-base">{plan.title}</CardTitle>
            <Badge variant="outline" className="text-xs">{ccpList.length} CCP</Badge>
            {!plan.isActive && <Badge variant="secondary" className="text-xs">Inaktiv</Badge>}
          </div>
          {canEdit && (
            <Button size="icon" variant="ghost" className="text-red-500 h-7 w-7" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {plan.approvedBy && <p className="text-xs text-muted-foreground ml-6">Godkjent av: {plan.approvedBy}</p>}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-3 space-y-3">
          {ccpList.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Ingen CCP-punkt lagt til ennå.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Prosessteg", "Faretyp.", "Farebeskriv.", "Kritisk grense", "Overvåkningsmetode", "Frekvens", "Korrigerende tiltak", "#"].map((h) => (
                      <th key={h} className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ccpList.map((ccp, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2 font-medium">{ccp.stepName}</td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-xs ${ccp.hazardType === "BIOLOGISK" ? "bg-red-100 text-red-700" : ccp.hazardType === "KJEMISK" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>{HAZARD_TYPES[ccp.hazardType]}</span></td>
                      <td className="p-2 max-w-[150px] truncate">{ccp.hazardDesc}</td>
                      <td className="p-2">{ccp.criticalLimit}</td>
                      <td className="p-2">{ccp.monitorMethod}</td>
                      <td className="p-2">{ccp.monitorFreq}</td>
                      <td className="p-2 max-w-[150px] truncate">{ccp.corrAction}</td>
                      <td className="p-2">
                        {canEdit && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeRow(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canEdit && showAdd && (
            <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
              <p className="text-xs font-semibold">Nytt CCP-punkt</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Prosessteg *", key: "stepName", placeholder: "f.eks. Kjøling etter koking" },
                  { label: "Farebeskriv. *", key: "hazardDesc", placeholder: "f.eks. Vekst av Salmonella" },
                  { label: "Kritisk grense *", key: "criticalLimit", placeholder: "f.eks. ≤4°C innen 2t" },
                  { label: "Overvåkningsmetode *", key: "monitorMethod", placeholder: "f.eks. Termometer" },
                  { label: "Frekvens *", key: "monitorFreq", placeholder: "f.eks. Hver 2. time" },
                  { label: "Korrigerende tiltak *", key: "corrAction", placeholder: "f.eks. Kast maten" },
                  { label: "Verifisering", key: "verifyMethod", placeholder: "f.eks. Ukentlig kalibrering" },
                  { label: "Dokumentasjon", key: "recordRequired", placeholder: "f.eks. Temperaturlogg" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className="space-y-0.5">
                    <Label className="text-xs">{label}</Label>
                    <Input className="h-8 text-xs" placeholder={placeholder} value={(newRow as any)[key]} onChange={(e) => setNewRow((r) => ({ ...r, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="space-y-0.5">
                  <Label className="text-xs">Faretype</Label>
                  <select className="w-full border rounded-md px-2 py-1.5 text-xs bg-background h-8" value={newRow.hazardType} onChange={(e) => setNewRow((r) => ({ ...r, hazardType: e.target.value as any }))}>
                    {Object.entries(HAZARD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={saving || !newRow.stepName} onClick={addRow}>Legg til CCP</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Avbryt</Button>
              </div>
            </div>
          )}
          {canEdit && !showAdd && (
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Legg til CCP-punkt
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
