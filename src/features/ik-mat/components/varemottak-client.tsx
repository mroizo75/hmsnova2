"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus } from "lucide-react";
import type { MatVaremottak } from "@prisma/client";

interface Props {
  items: MatVaremottak[];
  canEdit: boolean;
}

export function VaremottakClient({ items: initial, canEdit }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier: "",
    productName: "",
    batchLot: "",
    temperature: "",
    expiryDate: "",
    accepted: true,
    usedIn: "",
    receivedBy: "",
    deviationNote: "",
  });

  async function submit() {
    if (!form.supplier || !form.productName) {
      toast.error("Fyll inn leverandør og vare");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ik-mat/varemottak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedAt: new Date().toISOString(),
          supplier: form.supplier,
          productName: form.productName,
          batchLot: form.batchLot || null,
          temperature: form.temperature ? Number(form.temperature) : null,
          expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
          accepted: form.accepted,
          usedIn: form.usedIn || null,
          receivedBy: form.receivedBy || null,
          deviationNote: form.deviationNote || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setItems((prev) => [data.item, ...prev]);
      if (data.incident) {
        toast.warning(`Avvik opprettet (${data.incident.avviksnummer ?? "AVVIK"}).`);
      } else {
        toast.success(form.accepted ? "Varemottak registrert" : "Avvist vare registrert");
      }
      setShowForm(false);
      setForm({
        supplier: "",
        productName: "",
        batchLot: "",
        temperature: "",
        expiryDate: "",
        accepted: true,
        usedIn: "",
        receivedBy: "",
        deviationNote: "",
      });
      router.refresh();
    } catch {
      toast.error("Kunne ikke lagre varemottak");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/ik-mat" className="hover:underline">IK-mat</Link> / Varemottak
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-500" />
            Varemottak og sporbarhet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Forordning (EF) 178/2002 art. 18 og IK-mat § 5 – ett ledd bakover (leverandør/parti) og ett ledd fremover (brukt i).
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrer mottak
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Leverandør</Label>
            <Input value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))} />
          </div>
          <div>
            <Label>Vare</Label>
            <Input value={form.productName} onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))} />
          </div>
          <div>
            <Label>Parti / batch</Label>
            <Input value={form.batchLot} onChange={(e) => setForm((p) => ({ ...p, batchLot: e.target.value }))} />
          </div>
          <div>
            <Label>Mottakstemperatur (°C)</Label>
            <Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm((p) => ({ ...p, temperature: e.target.value }))} />
          </div>
          <div>
            <Label>Holdbarhet</Label>
            <Input type="date" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} />
          </div>
          <div>
            <Label>Brukt i (rett/avdeling)</Label>
            <Input value={form.usedIn} onChange={(e) => setForm((p) => ({ ...p, usedIn: e.target.value }))} />
          </div>
          <div>
            <Label>Mottatt av</Label>
            <Input value={form.receivedBy} onChange={(e) => setForm((p) => ({ ...p, receivedBy: e.target.value }))} />
          </div>
          <div>
            <Label>Merknad / avvik</Label>
            <Input value={form.deviationNote} onChange={(e) => setForm((p) => ({ ...p, deviationNote: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.accepted}
                onChange={(e) => setForm((p) => ({ ...p, accepted: e.target.checked }))}
              />
              Varen er godtatt
            </label>
            <Button onClick={submit} disabled={saving}>{saving ? "Lagrer…" : "Lagre"}</Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Tid</th>
              <th className="p-3">Leverandør</th>
              <th className="p-3">Vare / parti</th>
              <th className="p-3">Temp</th>
              <th className="p-3">Brukt i</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-muted-foreground">Ingen varemottak registrert ennå.</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(item.receivedAt).toLocaleString("nb-NO")}</td>
                <td className="p-3">{item.supplier}</td>
                <td className="p-3">
                  <p>{item.productName}</p>
                  {item.batchLot && <p className="text-xs text-muted-foreground">Parti {item.batchLot}</p>}
                </td>
                <td className="p-3">{item.temperature != null ? `${item.temperature} °C` : "—"}</td>
                <td className="p-3">{item.usedIn ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={item.accepted ? "secondary" : "destructive"}>
                    {item.accepted ? "Godtatt" : "Avvist"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
