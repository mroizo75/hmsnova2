"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromDateInput, toDateInput, type SkjenkeGjennomgangView } from "./skjenking-types";

interface Props {
  items: SkjenkeGjennomgangView[];
  canEdit: boolean;
  onSaved: () => Promise<void>;
}

export function SkjenkingGjennomgang({ items, canEdit, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    gjennomfortAv: "",
    funn: "",
    tiltak: "",
    nesteDato: "",
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/skjenking/gjennomgang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gjennomfortAt: new Date().toISOString(),
          gjennomfortAv: form.gjennomfortAv,
          funn: form.funn,
          tiltak: form.tiltak || null,
          nesteDato: fromDateInput(form.nesteDato),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Gjennomgang registrert");
      setForm({ gjennomfortAv: "", funn: "", tiltak: "", nesteDato: "" });
      await onSaved();
    } catch {
      toast.error("Kunne ikke lagre gjennomgangen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Alkoholforskriften § 8-3 nr. 6 krever systematisk gjennomgang for å sikre at internkontrollen virker. Minst én gang i året.
      </p>
      {canEdit && (
        <div className="grid gap-3 rounded-lg border p-4">
          <div>
            <Label>Gjennomført av</Label>
            <Input value={form.gjennomfortAv} onChange={(event) => setForm((prev) => ({ ...prev, gjennomfortAv: event.target.value }))} />
          </div>
          <div>
            <Label>Funn</Label>
            <Textarea rows={4} value={form.funn} onChange={(event) => setForm((prev) => ({ ...prev, funn: event.target.value }))} placeholder="Virker rutinene, er opplæringen gyldig, og er åpne avvik lukket?" />
          </div>
          <div>
            <Label>Tiltak etter gjennomgangen</Label>
            <Textarea rows={3} value={form.tiltak} onChange={(event) => setForm((prev) => ({ ...prev, tiltak: event.target.value }))} />
          </div>
          <div>
            <Label>Neste gjennomgang</Label>
            <Input type="date" value={form.nesteDato} onChange={(event) => setForm((prev) => ({ ...prev, nesteDato: event.target.value }))} />
          </div>
          <Button onClick={save} disabled={saving || !form.gjennomfortAv || !form.funn || !form.nesteDato}>
            {saving ? "Lagrer…" : "Registrer gjennomgang"}
          </Button>
        </div>
      )}
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Ingen gjennomgang er registrert.</p>}
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border p-4 text-sm">
            <p className="font-medium">
              {new Date(item.gjennomfortAt).toLocaleDateString("nb-NO")} · {item.gjennomfortAv}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{item.funn}</p>
            {item.tiltak && <p className="mt-2 text-muted-foreground">Tiltak: {item.tiltak}</p>}
            <p className="mt-2 text-muted-foreground">Neste: {toDateInput(item.nesteDato) || "ikke satt"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
