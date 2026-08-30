"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus } from "lucide-react";
import type { MatRenhold } from "@prisma/client";

interface Props {
  items: MatRenhold[];
  canEdit: boolean;
}

export function RenholdClient({ items: initial, canEdit }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    area: "",
    task: "",
    cleanedBy: "",
    note: "",
  });

  async function submit() {
    if (!form.area || !form.task) {
      toast.error("Fyll inn område og oppgave");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ik-mat/renhold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanedAt: new Date().toISOString(),
          area: form.area,
          task: form.task,
          cleanedBy: form.cleanedBy || null,
          approved: true,
          note: form.note || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setItems((prev) => [data.item, ...prev]);
      toast.success("Renhold registrert");
      setShowForm(false);
      setForm({ area: "", task: "", cleanedBy: "", note: "" });
      router.refresh();
    } catch {
      toast.error("Kunne ikke lagre renhold");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/ik-mat" className="hover:underline">IK-mat</Link> / Renhold
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-orange-500" />
            Renholdslogg
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            IK-mat § 5 nr. 3 og 6 og forordning (EF) 852/2004 vedlegg II – dokumentert renhold av lokaler og utstyr.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrer renhold
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Område</Label>
            <Input placeholder="Kjøkken, bar, toalett…" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} />
          </div>
          <div>
            <Label>Oppgave</Label>
            <Input placeholder="Gulv, benker, sluk…" value={form.task} onChange={(e) => setForm((p) => ({ ...p, task: e.target.value }))} />
          </div>
          <div>
            <Label>Utført av</Label>
            <Input value={form.cleanedBy} onChange={(e) => setForm((p) => ({ ...p, cleanedBy: e.target.value }))} />
          </div>
          <div>
            <Label>Merknad</Label>
            <Input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={submit} disabled={saving}>{saving ? "Lagrer…" : "Lagre"}</Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Tid</th>
              <th className="p-3">Område</th>
              <th className="p-3">Oppgave</th>
              <th className="p-3">Utført av</th>
              <th className="p-3">Merknad</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-muted-foreground">Ingen renhold registrert ennå.</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(item.cleanedAt).toLocaleString("nb-NO")}</td>
                <td className="p-3">{item.area}</td>
                <td className="p-3">{item.task}</td>
                <td className="p-3">{item.cleanedBy ?? "—"}</td>
                <td className="p-3">{item.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
