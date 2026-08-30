"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wine, Plus, GraduationCap } from "lucide-react";
import type { SkjenkeBevilling, SkjenkeHendelse } from "@prisma/client";

const TYPE_LABEL: Record<string, string> = {
  ALDERSKONTROLL: "Alderskontroll",
  BERUSELSE: "Beruselse",
  BORTVISNING: "Bortvisning",
  AVVIK: "Avvik",
  ANNET: "Annet",
};

const ACTION_LABEL: Record<string, string> = {
  AVSLATT: "Avslått servering",
  SERVERING_STOPPET: "Servering stoppet",
  BORTVIST: "Bortvist",
  ADVARSEL: "Advarsel",
  ANNET: "Annet",
};

const BERUSELSE_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  PA_VEI: "På vei mot åpenbart påvirket",
  APENBART_PAVIRKET: "Åpenbart påvirket",
};

export interface AlcoholTrainingStatus {
  courseKey: string;
  title: string;
  users: Array<{
    id: string;
    name: string;
    completed: boolean;
    validUntil: string | Date | null;
  }>;
}

interface Props {
  bevilling: SkjenkeBevilling | null;
  hendelser: SkjenkeHendelse[];
  alcoholTraining: AlcoholTrainingStatus;
  canEdit: boolean;
}

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function SkjenkingClient({ bevilling, hendelser: initialHendelser, alcoholTraining, canEdit }: Props) {
  const router = useRouter();
  const [hendelser, setHendelser] = useState(initialHendelser);
  const [savingBevilling, setSavingBevilling] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [savingHendelse, setSavingHendelse] = useState(false);
  const [form, setForm] = useState({
    bevillingsnummer: bevilling?.bevillingsnummer ?? "",
    kommune: bevilling?.kommune ?? "",
    gyldigFra: toDateInput(bevilling?.gyldigFra),
    gyldigTil: toDateInput(bevilling?.gyldigTil),
    styrer: bevilling?.styrer ?? "",
    stedfortreder: bevilling?.stedfortreder ?? "",
    skjenketider: bevilling?.skjenketider ?? "",
    internregler: bevilling?.internregler ?? "",
  });
  const [hendelse, setHendelse] = useState({
    type: "ALDERSKONTROLL",
    action: "AVSLATT",
    beruselsesgrad: "",
    registeredBy: "",
    note: "",
  });

  async function saveBevilling() {
    setSavingBevilling(true);
    try {
      const res = await fetch("/api/skjenking/bevilling", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bevillingsnummer: form.bevillingsnummer || null,
          kommune: form.kommune || null,
          gyldigFra: form.gyldigFra ? new Date(form.gyldigFra).toISOString() : null,
          gyldigTil: form.gyldigTil ? new Date(form.gyldigTil).toISOString() : null,
          styrer: form.styrer || null,
          stedfortreder: form.stedfortreder || null,
          skjenketider: form.skjenketider || null,
          internregler: form.internregler || null,
          sistGjennomgatt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Skjenkeregler lagret");
      router.refresh();
    } catch {
      toast.error("Kunne ikke lagre skjenkeregler");
    } finally {
      setSavingBevilling(false);
    }
  }

  async function saveHendelse() {
    setSavingHendelse(true);
    try {
      const res = await fetch("/api/skjenking/hendelser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredAt: new Date().toISOString(),
          type: hendelse.type,
          action: hendelse.action,
          beruselsesgrad: hendelse.beruselsesgrad || null,
          registeredBy: hendelse.registeredBy || null,
          note: hendelse.note || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setHendelser((prev) => [data.item, ...prev]);
      toast.success("Hendelse registrert");
      setShowForm(false);
      setHendelse({ type: "ALDERSKONTROLL", action: "AVSLATT", beruselsesgrad: "", registeredBy: "", note: "" });
      router.refresh();
    } catch {
      toast.error("Kunne ikke registrere hendelse");
    } finally {
      setSavingHendelse(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wine className="h-6 w-6 text-purple-600" />
          Internkontroll skjenking
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alkoholforskriften § 8-1 og § 8-3 – skjenkeregler, alderskontroll, beruselse, bortvisning og dokumentasjon.
        </p>
      </div>

      <Tabs defaultValue="regler">
        <TabsList>
          <TabsTrigger value="regler">Skjenkeregler</TabsTrigger>
          <TabsTrigger value="hendelser">Hendelser</TabsTrigger>
          <TabsTrigger value="opplaering">Opplæring</TabsTrigger>
        </TabsList>

        <TabsContent value="regler" className="space-y-4 mt-4">
          <div className="grid gap-3 sm:grid-cols-2 border rounded-lg p-4">
            <div>
              <Label>Bevillingsnummer</Label>
              <Input disabled={!canEdit} value={form.bevillingsnummer} onChange={(e) => setForm((p) => ({ ...p, bevillingsnummer: e.target.value }))} />
            </div>
            <div>
              <Label>Kommune</Label>
              <Input disabled={!canEdit} value={form.kommune} onChange={(e) => setForm((p) => ({ ...p, kommune: e.target.value }))} />
            </div>
            <div>
              <Label>Gyldig fra</Label>
              <Input type="date" disabled={!canEdit} value={form.gyldigFra} onChange={(e) => setForm((p) => ({ ...p, gyldigFra: e.target.value }))} />
            </div>
            <div>
              <Label>Gyldig til</Label>
              <Input type="date" disabled={!canEdit} value={form.gyldigTil} onChange={(e) => setForm((p) => ({ ...p, gyldigTil: e.target.value }))} />
            </div>
            <div>
              <Label>Styrer</Label>
              <Input disabled={!canEdit} value={form.styrer} onChange={(e) => setForm((p) => ({ ...p, styrer: e.target.value }))} />
            </div>
            <div>
              <Label>Stedfortreder</Label>
              <Input disabled={!canEdit} value={form.stedfortreder} onChange={(e) => setForm((p) => ({ ...p, stedfortreder: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Skjenketider og vilkår</Label>
              <Textarea
                disabled={!canEdit}
                rows={3}
                value={form.skjenketider}
                onChange={(e) => setForm((p) => ({ ...p, skjenketider: e.target.value }))}
                placeholder="F.eks. øl/vin til 01:00, brennevin til 00:00. Ingen skjenking til åpenbart påvirkede."
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Interne regler</Label>
              <Textarea
                disabled={!canEdit}
                rows={6}
                value={form.internregler}
                onChange={(e) => setForm((p) => ({ ...p, internregler: e.target.value }))}
                placeholder="Alderskontroll (ID under 25), vurdering av beruselse, bortvisning, når politi varsles, opplæring av nye ansatte."
              />
            </div>
            {canEdit && (
              <div className="sm:col-span-2">
                <Button onClick={saveBevilling} disabled={savingBevilling}>
                  {savingBevilling ? "Lagrer…" : "Lagre regler"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hendelser" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Ikke skriv gjestens navn, fødselsnummer eller legitimasjonsnummer (GDPR art. 5).
            </p>
            {canEdit && (
              <Button onClick={() => setShowForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrer hendelse
              </Button>
            )}
          </div>

          {showForm && (
            <div className="border rounded-lg p-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={hendelse.type}
                  onChange={(e) => setHendelse((p) => ({ ...p, type: e.target.value }))}
                >
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tiltak</Label>
                <select
                  className="w-full h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={hendelse.action}
                  onChange={(e) => setHendelse((p) => ({ ...p, action: e.target.value }))}
                >
                  {Object.entries(ACTION_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Beruselsesgrad</Label>
                <select
                  className="w-full h-9 rounded-md border bg-transparent px-3 text-sm"
                  value={hendelse.beruselsesgrad}
                  onChange={(e) => setHendelse((p) => ({ ...p, beruselsesgrad: e.target.value }))}
                >
                  <option value="">Ikke vurdert</option>
                  {Object.entries(BERUSELSE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Registrert av</Label>
                <Input value={hendelse.registeredBy} onChange={(e) => setHendelse((p) => ({ ...p, registeredBy: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notat uten identitet</Label>
                <Input value={hendelse.note} onChange={(e) => setHendelse((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <div>
                <Button onClick={saveHendelse} disabled={savingHendelse}>
                  {savingHendelse ? "Lagrer…" : "Lagre hendelse"}
                </Button>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Tid</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Tiltak</th>
                  <th className="p-3">Beruselse</th>
                  <th className="p-3">Av</th>
                </tr>
              </thead>
              <tbody>
                {hendelser.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-muted-foreground">Ingen skjenkehendelser registrert ennå.</td></tr>
                )}
                {hendelser.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{new Date(item.occurredAt).toLocaleString("nb-NO")}</td>
                    <td className="p-3"><Badge variant="secondary">{TYPE_LABEL[item.type] ?? item.type}</Badge></td>
                    <td className="p-3">{ACTION_LABEL[item.action] ?? item.action}</td>
                    <td className="p-3">{item.beruselsesgrad ? BERUSELSE_LABEL[item.beruselsesgrad] ?? item.beruselsesgrad : "—"}</td>
                    <td className="p-3">{item.registeredBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="opplaering" className="space-y-4 mt-4">
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm">
              Alkoholforskriften § 8-3 nr. 2 og alkoholloven § 1-7c krever at ansatte har tilstrekkelig kunnskap om aldersgrenser, beruselse og bortvisning.
            </p>
            <p className="font-medium">{alcoholTraining.title}</p>
            <p className="text-sm text-muted-foreground">
              {alcoholTraining.users.filter((u) => u.completed).length} av {alcoholTraining.users.length} ansatte har gyldig kurs.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Ansatt</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Gyldig til</th>
                  </tr>
                </thead>
                <tbody>
                  {alcoholTraining.users.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-muted-foreground">Ingen ansatte funnet.</td></tr>
                  )}
                  {alcoholTraining.users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">
                        <Badge variant={user.completed ? "secondary" : "destructive"}>
                          {user.completed ? "Fullført" : "Mangler"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {user.validUntil ? new Date(user.validUntil).toLocaleDateString("nb-NO") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button asChild>
              <Link href="/dashboard/training?tema=skjenking">
                <GraduationCap className="mr-2 h-4 w-4" />
                Registrer skjenkekurs
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
