"use client";

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromDateInput, selectClass, toDateInput, type SkjenkeBevillingView } from "./skjenking-types";

interface Props {
  bevilling: SkjenkeBevillingView | null;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}

export function SkjenkingBevillingForm({ bevilling, canEdit, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bevillingstype: bevilling?.bevillingstype === "SALG" || bevilling?.bevillingstype === "BEGGE" ? bevilling.bevillingstype : "SKJENKING",
    ambulerende: bevilling?.ambulerende ?? false,
    bevillingsnummer: bevilling?.bevillingsnummer ?? "",
    kommune: bevilling?.kommune ?? "",
    gyldigFra: toDateInput(bevilling?.gyldigFra),
    gyldigTil: toDateInput(bevilling?.gyldigTil),
    gruppe1: bevilling?.gruppe1 ?? true,
    gruppe2: bevilling?.gruppe2 ?? true,
    gruppe3: bevilling?.gruppe3 ?? false,
    styrer: bevilling?.styrer ?? "",
    stedfortreder: bevilling?.stedfortreder ?? "",
    styrerProveDato: toDateInput(bevilling?.styrerProveDato),
    stedfortrederProveDato: toDateInput(bevilling?.stedfortrederProveDato),
    skjenketider: bevilling?.skjenketider ?? "",
    internregler: bevilling?.internregler ?? "",
    alderskontrollAnsvar: bevilling?.alderskontrollAnsvar ?? "",
    beruselseAnsvar: bevilling?.beruselseAnsvar ?? "",
    bortvisningAnsvar: bevilling?.bortvisningAnsvar ?? "",
    opplaeringAnsvar: bevilling?.opplaeringAnsvar ?? "",
    alkoholfrittUtvalg: bevilling?.alkoholfrittUtvalg ?? "",
    harHalvflasker: bevilling?.harHalvflasker ?? false,
    harMinibar: bevilling?.harMinibar ?? false,
    sarvilkar: bevilling?.sarvilkar ?? "",
    sistOmsetningsoppgave: toDateInput(bevilling?.sistOmsetningsoppgave),
  });

  function text(key: keyof typeof form) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/skjenking/bevilling", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bevillingsnummer: form.bevillingsnummer || null,
          kommune: form.kommune || null,
          gyldigFra: fromDateInput(form.gyldigFra),
          gyldigTil: fromDateInput(form.gyldigTil),
          styrer: form.styrer || null,
          stedfortreder: form.stedfortreder || null,
          styrerProveDato: fromDateInput(form.styrerProveDato),
          stedfortrederProveDato: fromDateInput(form.stedfortrederProveDato),
          skjenketider: form.skjenketider || null,
          internregler: form.internregler || null,
          alderskontrollAnsvar: form.alderskontrollAnsvar || null,
          beruselseAnsvar: form.beruselseAnsvar || null,
          bortvisningAnsvar: form.bortvisningAnsvar || null,
          opplaeringAnsvar: form.opplaeringAnsvar || null,
          alkoholfrittUtvalg: form.alkoholfrittUtvalg || null,
          sarvilkar: form.sarvilkar || null,
          sistOmsetningsoppgave: fromDateInput(form.sistOmsetningsoppgave),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Bevilling og organisering lagret");
      await onSaved();
    } catch {
      toast.error("Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  }

  const skjenker = form.bevillingstype !== "SALG";

  return (
    <div className="max-w-5xl space-y-6">
      <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold">Bevillingen</h2>
        <p className="sm:col-span-2 text-sm text-muted-foreground">
          Alkoholforskriften § 8-3 nr. 1: oversikten skal gjelde denne bevillingen, ikke bare lovteksten.
        </p>
        <div>
          <Label>Type</Label>
          <select className={selectClass} disabled={!canEdit} value={form.bevillingstype} onChange={text("bevillingstype")}>
            <option value="SKJENKING">Skjenkebevilling</option>
            <option value="SALG">Salgsbevilling</option>
            <option value="BEGGE">Salg og skjenking</option>
          </select>
        </div>
        <div>
          <Label>Bevillingsnummer</Label>
          <Input disabled={!canEdit} value={form.bevillingsnummer} onChange={text("bevillingsnummer")} />
        </div>
        <div>
          <Label>Kommune</Label>
          <Input disabled={!canEdit} value={form.kommune} onChange={text("kommune")} />
        </div>
        <div>
          <Label>Siste omsetningsoppgave</Label>
          <Input type="date" disabled={!canEdit} value={form.sistOmsetningsoppgave} onChange={text("sistOmsetningsoppgave")} />
        </div>
        <div>
          <Label>Gyldig fra</Label>
          <Input type="date" disabled={!canEdit} value={form.gyldigFra} onChange={text("gyldigFra")} />
        </div>
        <div>
          <Label>Gyldig til</Label>
          <Input type="date" disabled={!canEdit} value={form.gyldigTil} onChange={text("gyldigTil")} />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={!canEdit} checked={form.gruppe1} onChange={(e) => setForm((p) => ({ ...p, gruppe1: e.target.checked }))} />
            Gruppe 1 (over 2,5 til 4,7 %)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={!canEdit} checked={form.gruppe2} onChange={(e) => setForm((p) => ({ ...p, gruppe2: e.target.checked }))} />
            Gruppe 2 (over 4,7 til under 22 %)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={!canEdit} checked={form.gruppe3} onChange={(e) => setForm((p) => ({ ...p, gruppe3: e.target.checked }))} />
            Gruppe 3 (22–60 %)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={!canEdit} checked={form.ambulerende} onChange={(e) => setForm((p) => ({ ...p, ambulerende: e.target.checked }))} />
            Ambulerende bevilling
          </label>
        </div>
        <div className="sm:col-span-2">
          <Label>{skjenker ? "Skjenketider og vilkår" : "Salgsvilkår"}</Label>
          <Textarea disabled={!canEdit} rows={3} value={form.skjenketider} onChange={text("skjenketider")} placeholder="Tidene og særvilkårene slik de står i bevillingsvedtaket." />
        </div>
        <div className="sm:col-span-2">
          <Label>Særvilkår fra kommunen</Label>
          <Textarea disabled={!canEdit} rows={2} value={form.sarvilkar} onChange={text("sarvilkar")} />
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold">Organisering og myndighet</h2>
        <p className="sm:col-span-2 text-sm text-muted-foreground">
          Alkoholforskriften § 2-2 og § 5-1, § 8-3 nr. 3. Kunnskapsprøven gjelder styrer og stedfortreder.
        </p>
        <div>
          <Label>Styrer</Label>
          <Input disabled={!canEdit} value={form.styrer} onChange={text("styrer")} />
        </div>
        <div>
          <Label>Kunnskapsprøve, styrer</Label>
          <Input type="date" disabled={!canEdit} value={form.styrerProveDato} onChange={text("styrerProveDato")} />
        </div>
        <div>
          <Label>Stedfortreder</Label>
          <Input disabled={!canEdit} value={form.stedfortreder} onChange={text("stedfortreder")} />
        </div>
        <div>
          <Label>Kunnskapsprøve, stedfortreder</Label>
          <Input type="date" disabled={!canEdit} value={form.stedfortrederProveDato} onChange={text("stedfortrederProveDato")} />
        </div>
        <div>
          <Label>Ansvar for alderskontroll</Label>
          <Input disabled={!canEdit} value={form.alderskontrollAnsvar} onChange={text("alderskontrollAnsvar")} />
        </div>
        <div>
          <Label>Ansvar for å stoppe skjenking</Label>
          <Input disabled={!canEdit} value={form.beruselseAnsvar} onChange={text("beruselseAnsvar")} />
        </div>
        <div>
          <Label>Ansvar for bortvisning</Label>
          <Input disabled={!canEdit} value={form.bortvisningAnsvar} onChange={text("bortvisningAnsvar")} />
        </div>
        <div>
          <Label>Ansvar for opplæring</Label>
          <Input disabled={!canEdit} value={form.opplaeringAnsvar} onChange={text("opplaeringAnsvar")} />
        </div>
      </section>

      {skjenker && (
        <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-sm font-semibold">Serveringsplikt</h2>
          <div className="sm:col-span-2">
            <Label>Alkoholfrie og alkoholsvake drikker på skjenkekartet</Label>
            <Textarea disabled={!canEdit} rows={3} value={form.alkoholfrittUtvalg} onChange={text("alkoholfrittUtvalg")} placeholder="Alkoholforskriften § 4-6" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!canEdit} checked={form.harHalvflasker} onChange={(e) => setForm((p) => ({ ...p, harHalvflasker: e.target.checked }))} />
            Vi fører halvflasker når de er i handelen (§ 4-7)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!canEdit} checked={form.harMinibar} onChange={(e) => setForm((p) => ({ ...p, harMinibar: e.target.checked }))} />
            Selvbetjening på hotellrom (§ 4-8)
          </label>
        </section>
      )}

      <section className="rounded-lg border p-4">
        <Label>Stedets tillegg til standardrutinene</Label>
        <Textarea className="mt-2" disabled={!canEdit} rows={4} value={form.internregler} onChange={text("internregler")} />
      </section>

      {canEdit && (
        <Button onClick={save} disabled={saving}>
          {saving ? "Lagrer…" : "Lagre bevilling"}
        </Button>
      )}
    </div>
  );
}
