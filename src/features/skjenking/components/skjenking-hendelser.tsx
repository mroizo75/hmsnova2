"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BERUSELSE,
  HENDELSE_ACTION,
  HENDELSE_STATUS,
  HENDELSE_TYPE,
} from "@/features/skjenking/lib/internkontroll";
import { selectClass, type SkjenkeHendelseView } from "./skjenking-types";

interface Props {
  hendelser: SkjenkeHendelseView[];
  canEdit: boolean;
  onSaved: () => Promise<void>;
}

const empty = {
  type: "ALDERSKONTROLL",
  action: "AVSLATT",
  beruselsesgrad: "",
  registeredBy: "",
  note: "",
  korrigerendeTiltak: "",
  forebygging: "",
  status: "LUKKET",
};

export function SkjenkingHendelser({ hendelser, canEdit, onSaved }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeText, setCloseText] = useState("");

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/skjenking/hendelser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredAt: new Date().toISOString(),
          type: form.type,
          action: form.action,
          beruselsesgrad: form.beruselsesgrad || null,
          registeredBy: form.registeredBy || null,
          note: form.note || null,
          korrigerendeTiltak: form.korrigerendeTiltak || null,
          forebygging: form.forebygging || null,
          status: form.type === "AVVIK" ? form.status : "LUKKET",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Kunne ikke registrere hendelse");
      }
      toast.success("Hendelse registrert");
      setShowForm(false);
      setForm(empty);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunne ikke registrere hendelse");
    } finally {
      setSaving(false);
    }
  }

  async function closeItem(item: SkjenkeHendelseView) {
    setSaving(true);
    try {
      const res = await fetch(`/api/skjenking/hendelser/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "LUKKET",
          korrigerendeTiltak: closeText,
          forebygging: item.forebygging,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Kunne ikke lukke hendelsen");
      }
      toast.success("Hendelse lukket");
      setClosingId(null);
      setCloseText("");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunne ikke lukke hendelsen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ikke skriv gjestens navn, fødselsnummer eller legitimasjonsnummer (GDPR art. 5). Avvik skal lukkes med tiltak, jf. § 8-3 nr. 5.
        </p>
        {canEdit && (
          <Button onClick={() => setShowForm((open) => !open)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrer hendelse
          </Button>
        )}
      </div>

      {showForm && (
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <select
              className={selectClass}
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value,
                  status: event.target.value === "AVVIK" ? "APEN" : "LUKKET",
                }))
              }
            >
              {Object.entries(HENDELSE_TYPE).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tiltak der og da</Label>
            <select className={selectClass} value={form.action} onChange={(event) => setForm((prev) => ({ ...prev, action: event.target.value }))}>
              {Object.entries(HENDELSE_ACTION).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Beruselsesgrad</Label>
            <select className={selectClass} value={form.beruselsesgrad} onChange={(event) => setForm((prev) => ({ ...prev, beruselsesgrad: event.target.value }))}>
              <option value="">Ikke vurdert</option>
              {Object.entries(BERUSELSE).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Registrert av</Label>
            <Input value={form.registeredBy} onChange={(event) => setForm((prev) => ({ ...prev, registeredBy: event.target.value }))} />
          </div>
          {form.type === "AVVIK" && (
            <div>
              <Label>Status</Label>
              <select className={selectClass} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                {Object.entries(HENDELSE_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Notat uten identitet</Label>
            <Input value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Korrigerende tiltak</Label>
            <Input value={form.korrigerendeTiltak} onChange={(event) => setForm((prev) => ({ ...prev, korrigerendeTiltak: event.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Forebygging</Label>
            <Input value={form.forebygging} onChange={(event) => setForm((prev) => ({ ...prev, forebygging: event.target.value }))} />
          </div>
          <div>
            <Button onClick={save} disabled={saving}>{saving ? "Lagrer…" : "Lagre hendelse"}</Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Tid</th>
              <th className="p-3">Type</th>
              <th className="p-3">Tiltak</th>
              <th className="p-3">Status</th>
              <th className="p-3">Av</th>
            </tr>
          </thead>
          <tbody>
            {hendelser.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-muted-foreground">Ingen skjenkehendelser registrert ennå.</td>
              </tr>
            )}
            {hendelser.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="p-3 whitespace-nowrap">{new Date(item.occurredAt).toLocaleString("nb-NO")}</td>
                <td className="p-3">
                  <Badge variant="secondary">{HENDELSE_TYPE[item.type as keyof typeof HENDELSE_TYPE] ?? item.type}</Badge>
                  {item.note && <p className="mt-1 text-muted-foreground">{item.note}</p>}
                </td>
                <td className="p-3">
                  {HENDELSE_ACTION[item.action as keyof typeof HENDELSE_ACTION] ?? item.action}
                  {item.korrigerendeTiltak && <p className="mt-1 text-muted-foreground">{item.korrigerendeTiltak}</p>}
                </td>
                <td className="p-3">
                  <Badge variant={item.status === "APEN" ? "destructive" : "secondary"}>
                    {HENDELSE_STATUS[item.status as keyof typeof HENDELSE_STATUS] ?? item.status}
                  </Badge>
                  {canEdit && item.status === "APEN" && (
                    <div className="mt-2 space-y-2">
                      {closingId === item.id ? (
                        <>
                          <Input value={closeText} placeholder="Korrigerende tiltak" onChange={(event) => setCloseText(event.target.value)} />
                          <Button size="sm" disabled={saving} onClick={() => closeItem(item)}>Lukk</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setClosingId(item.id); setCloseText(item.korrigerendeTiltak ?? ""); }}>
                          Lukk avvik
                        </Button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">{item.registeredBy ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
