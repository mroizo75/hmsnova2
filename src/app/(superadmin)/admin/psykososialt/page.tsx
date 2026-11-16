"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSuperadminWellbeingForm,
  listSuperadminWellbeingForms,
  setSuperadminWellbeingFormActive,
} from "@/server/actions/superadmin-wellbeing-form.actions";

type FieldType = "LIKERT_SCALE" | "RADIO" | "TEXTAREA" | "SECTION_HEADER";

type DraftField = {
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  options: string;
};

const emptyField = (): DraftField => ({
  label: "",
  fieldType: "LIKERT_SCALE",
  isRequired: true,
  options: "",
});

export default function SuperadminWellbeingPage() {
  const [forms, setForms] = useState<Extract<Awaited<ReturnType<typeof listSuperadminWellbeingForms>>, { success: true }>["forms"]>([]);
  const [tenants, setTenants] = useState<Extract<Awaited<ReturnType<typeof listSuperadminWellbeingForms>>, { success: true }>["tenants"]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [fields, setFields] = useState<DraftField[]>([emptyField()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function reload() {
    const result = await listSuperadminWellbeingForms();
    if (!result.success) {
      setError(result.error);
      return;
    }
    setForms(result.forms);
    setTenants(result.tenants);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Psykososiale skjemaer</h1>
        <p className="mt-1 text-muted-foreground">
          Lag et skjema for én bedrift, eller for alle. Bedriften sender det selv til ansatte som skal svare. Svarene lagres uten navn.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nytt skjema</CardTitle>
          <CardDescription>Skala 1–5, avkrysning, fritekst eller en mellomtittel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wb-title">Tittel</Label>
              <Input id="wb-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wb-tenant">Bedrift</Label>
              <select
                id="wb-tenant"
                className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              >
                <option value="">Alle bedrifter</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="wb-description">Beskrivelse</Label>
              <Textarea id="wb-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>

          {fields.map((field, index) => (
            <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4">
              <Input
                value={field.label}
                placeholder={field.fieldType === "SECTION_HEADER" ? "Mellomtittel" : "Spørsmål"}
                onChange={(event) => updateField(index, { label: event.target.value })}
              />
              <select
                className="h-10 rounded-md border bg-transparent px-2 text-sm"
                value={field.fieldType}
                onChange={(event) => updateField(index, { fieldType: event.target.value as FieldType })}
              >
                <option value="LIKERT_SCALE">Skala 1–5</option>
                <option value="RADIO">Valg</option>
                <option value="TEXTAREA">Fritekst</option>
                <option value="SECTION_HEADER">Mellomtittel</option>
              </select>
              {field.fieldType === "RADIO" ? (
                <Input
                  value={field.options}
                  placeholder="Alternativer, kommaseparert"
                  onChange={(event) => updateField(index, { options: event.target.value })}
                />
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.isRequired}
                    onChange={(event) => updateField(index, { isRequired: event.target.checked })}
                  />
                  Påkrevd
                </label>
              )}
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setFields((current) => current.filter((_, item) => item !== index))}
              >
                Fjern
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => setFields((current) => [...current, emptyField()])}>
              Legg til spørsmål
            </Button>
            <Button disabled={pending} onClick={save}>
              {pending ? "Lagrer…" : "Lagre skjema"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eksisterende</CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen skjemaer ennå.</p>
          ) : (
            <ul className="divide-y">
              {forms.map((form) => (
                <li key={form.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{form.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {form.isGlobal ? "Alle bedrifter" : form.tenantName ?? "Én bedrift"} · {form.fieldCount} felt
                      {form.isActive ? "" : " · skjult"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={async () => {
                      const result = await setSuperadminWellbeingFormActive({ id: form.id, isActive: !form.isActive });
                      if (!result.success) setError(result.error);
                      else reload();
                    }}
                  >
                    {form.isActive ? "Skjul" : "Vis"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function updateField(index: number, patch: Partial<DraftField>) {
    setFields((current) => current.map((field, item) => (item === index ? { ...field, ...patch } : field)));
  }

  async function save() {
    setPending(true);
    setError(null);
    const result = await createSuperadminWellbeingForm({
      title,
      description,
      tenantId,
      fields: fields
        .filter((field) => field.label.trim())
        .map((field) => ({
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          options: field.options
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean),
        })),
    });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setTitle("");
    setDescription("");
    setTenantId("");
    setFields([emptyField()]);
    reload();
  }
}
