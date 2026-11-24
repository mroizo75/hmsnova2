"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  QMS_MODULE_LINKS,
  QMS_PROCESS_KINDS,
  QMS_PROCESS_KIND_LABELS,
  QMS_PROCESS_STATUSES,
  QMS_PROCESS_STATUS_LABELS,
  type QmsProcessKindValue,
  type QmsProcessStatusValue,
} from "@/lib/qms-processes";
import { createQmsProcess, updateQmsProcess } from "@/server/actions/qms-process.actions";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm sm:h-9 md:text-sm";

export type ProcessFormStep = { title: string; description: string };

export type ProcessFormValues = {
  id?: string;
  name: string;
  kind: QmsProcessKindValue;
  status: QmsProcessStatusValue;
  sortOrder: number;
  purpose: string;
  inputs: string;
  outputs: string;
  criteria: string;
  resources: string;
  risksAndOpportunities: string;
  scopeReason: string;
  evaluationNote: string;
  lastEvaluatedAt: string;
  nextReviewAt: string;
  ownerId: string;
  routineId: string;
  moduleHref: string;
  deliversTo: string[];
  steps: ProcessFormStep[];
};

type Option = { id: string; name?: string | null; title?: string; email?: string | null };

export function ProcessForm({
  initial,
  users,
  routines,
  processes,
}: {
  initial?: ProcessFormValues;
  users: Option[];
  routines: Option[];
  processes: Option[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessFormStep[]>(
    initial?.steps.length ? initial.steps : [{ title: "", description: "" }],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "stepsJson",
      JSON.stringify(steps.filter((step) => step.title.trim().length > 0)),
    );
    setError(null);
    startTransition(async () => {
      const result = initial?.id
        ? await updateQmsProcess(initial.id, formData)
        : await createQmsProcess(formData);
      if ("error" in result) {
        setError(result.error);
        toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
        return;
      }
      router.push(`/dashboard/prosesser/${result.id}`);
      router.refresh();
    });
  };

  const others = processes.filter((process) => process.id !== initial?.id);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prosessen</CardTitle>
          <CardDescription>
            ISO 9001:2015 pkt. 4.4. Utkast kan være ufullstendig. Aktiv krever formål, inn og ut, kriterier, ressurser, eier, risiko, steg og neste vurdering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Navn</Label>
              <Input id="name" name="name" required minLength={2} defaultValue={initial?.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <select id="kind" name="kind" className={selectClass} defaultValue={initial?.kind ?? "HOVED"}>
                {QMS_PROCESS_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{QMS_PROCESS_KIND_LABELS[kind]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className={selectClass} defaultValue={initial?.status ?? "DRAFT"}>
                {QMS_PROCESS_STATUSES.map((status) => (
                  <option key={status} value={status}>{QMS_PROCESS_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerId">Prosesseier</Label>
              <select id="ownerId" name="ownerId" className={selectClass} defaultValue={initial?.ownerId ?? ""}>
                <option value="">Ikke valgt</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Rekkefølge</Label>
              <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={initial?.sortOrder ?? 0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scopeReason">Begrunnelse hvis prosessen er utenfor omfang</Label>
            <Textarea id="scopeReason" name="scopeReason" rows={2} defaultValue={initial?.scopeReason ?? ""} />
            <p className="text-xs text-muted-foreground">ISO 9001:2015 pkt. 4.3. Påkrevd når status er utenfor omfang.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Styring av prosessen</CardTitle>
          <CardDescription>Innganger, resultater, kriterier, ressurser og risiko (ISO 9001:2015 pkt. 4.4.1 a–f).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Formål" name="purpose" value={initial?.purpose} />
          <Field label="Innganger" name="inputs" value={initial?.inputs} />
          <Field label="Forventede resultater" name="outputs" value={initial?.outputs} />
          <Field label="Kriterier og oppfølging" name="criteria" value={initial?.criteria} />
          <Field label="Ressurser" name="resources" value={initial?.resources} />
          <Field label="Risiko og muligheter" name="risksAndOpportunities" value={initial?.risksAndOpportunities} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steg</CardTitle>
          <CardDescription>Rekkefølgen arbeidet gjøres i. En aktiv prosess trenger minst ett steg.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`step-${index}`}>Steg {index + 1}</Label>
                {steps.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSteps((current) => current.filter((_, item) => item !== index))}
                  >
                    Fjern
                  </Button>
                ) : null}
              </div>
              <Input
                id={`step-${index}`}
                value={step.title}
                onChange={(event) =>
                  setSteps((current) => current.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, title: event.target.value } : item
                  )))
                }
              />
              <Textarea
                value={step.description}
                rows={2}
                placeholder="Hva som skal være gjort i steget"
                onChange={(event) =>
                  setSteps((current) => current.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, description: event.target.value } : item
                  )))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setSteps((current) => [...current, { title: "", description: "" }])}
          >
            Legg til steg
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Samspill</CardTitle>
          <CardDescription>Hvilke prosesser som mottar resultatet herfra (ISO 9001:2015 pkt. 4.4.1 b).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground">Andre prosesser kan kobles når de er registrert.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {others.map((process) => (
                <label key={process.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="deliversTo"
                    value={process.id}
                    defaultChecked={initial?.deliversTo.includes(process.id)}
                  />
                  {process.name}
                </label>
              ))}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="routineId">Rutine som beskriver utførelsen</Label>
              <select id="routineId" name="routineId" className={selectClass} defaultValue={initial?.routineId ?? ""}>
                <option value="">Ingen rutine</option>
                {routines.map((routine) => (
                  <option key={routine.id} value={routine.id}>{routine.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="moduleHref">Modul i systemet</Label>
              <select id="moduleHref" name="moduleHref" className={selectClass} defaultValue={initial?.moduleHref ?? ""}>
                {QMS_MODULE_LINKS.map((link) => (
                  <option key={link.href || "none"} value={link.href}>{link.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vurdering</CardTitle>
          <CardDescription>Prosessene skal vurderes og endres når de ikke gir tilsiktet resultat (ISO 9001:2015 pkt. 4.4.1 g).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lastEvaluatedAt">Sist vurdert</Label>
              <Input id="lastEvaluatedAt" name="lastEvaluatedAt" type="date" defaultValue={initial?.lastEvaluatedAt ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextReviewAt">Neste vurdering</Label>
              <Input id="nextReviewAt" name="nextReviewAt" type="date" defaultValue={initial?.nextReviewAt ?? ""} />
            </div>
          </div>
          <Field label="Hva viste vurderingen, og hva ble endret" name="evaluationNote" value={initial?.evaluationNote} />
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Lagrer…" : "Lagre prosess"}</Button>
    </form>
  );
}

function Field({ label, name, value }: { label: string; name: string; value?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={3} defaultValue={value ?? ""} />
    </div>
  );
}
