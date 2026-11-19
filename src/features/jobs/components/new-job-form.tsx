"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createFieldJob, listFieldJobOptions } from "@/server/actions/accounting.actions";
import { createCustomerFromBrreg, searchBrregCompanies } from "@/server/actions/customer.actions";
import { searchTimesheetCustomers } from "@/server/actions/timesheet.actions";

type Customer = { externalId: string; name: string; organizationNumber: string | null };
type BrregHit = { organisasjonsnummer: string; navn: string };

export function NewJobForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [hms, setHms] = useState(false);
  const [brregQuery, setBrregQuery] = useState("");
  const [brregHits, setBrregHits] = useState<BrregHit[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Array<{ externalId: string; name: string }>>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templates, setTemplates] = useState<Array<{ externalId: string; name: string }>>([]);

  useEffect(() => {
    listFieldJobOptions().then((options) => {
      setDepartments(options.departments);
      setTemplates(options.templates);
      setTemplateId(options.defaultTemplateId || "");
    });
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setCustomers([]);
      return;
    }
    const handle = setTimeout(() => {
      searchTimesheetCustomers(query).then(setCustomers);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      toast({ title: "Kontaktperson med telefon er påkrevd", variant: "destructive" });
      return;
    }
    if (!templateId) {
      toast({ title: "Velg malprosjekt å hente priser fra", variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await createFieldJob({
      name,
      customerExternalId: customerId || undefined,
      location,
      jobKind: hms ? "HMS" : "SERVICE",
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      departmentExternalId: departmentId || undefined,
      priceTemplateExternalId: templateId,
    });
    setLoading(false);
    if (!res.success) {
      toast({ title: "Kunne ikke opprette", description: res.error, variant: "destructive" });
      return;
    }
    router.push(`/ansatt/jobber/${res.data.id}`);
  }

  const templateHits = templates.filter((template) =>
    template.name.toLowerCase().includes(templateQuery.trim().toLowerCase())
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Org.nr / ny kunde fra Brønnøysund</Label>
        <Input
          value={brregQuery}
          onChange={(e) => setBrregQuery(e.target.value)}
          placeholder="Navn eller org.nr"
        />
        <Button
          type="button"
          variant="outline"
          className="bg-transparent"
          onClick={async () => {
            if (brregQuery.trim().length < 2) {
              setBrregHits([]);
              return;
            }
            const hits = await searchBrregCompanies(brregQuery);
            setBrregHits(hits.map((h) => ({ organisasjonsnummer: h.organisasjonsnummer, navn: h.navn })));
          }}
        >
          Søk
        </Button>
        {brregHits.map((h) => (
          <Button
            key={h.organisasjonsnummer}
            type="button"
            variant="outline"
            className="bg-transparent w-full justify-start"
            onClick={async () => {
              const res = await createCustomerFromBrreg({
                organizationNumber: h.organisasjonsnummer,
                name: h.navn,
              });
              if (!res.success) {
                toast({ title: res.error, variant: "destructive" });
                if ("duplicateExternalId" in res && res.duplicateExternalId) {
                  setCustomerId(res.duplicateExternalId);
                }
                return;
              }
              setCustomerId(res.data.externalId);
              toast({ title: "Kunde opprettet" });
            }}
          >
            {h.navn} ({h.organisasjonsnummer})
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Kunde (valgfritt)</Label>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCustomerId("");
          }}
          placeholder="Søk kunde"
        />
        {query.trim().length >= 2 &&
          customers.map((c) => (
            <button
              key={c.externalId}
              type="button"
              className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setCustomerId(c.externalId);
                setQuery(c.name);
                setCustomers([]);
              }}
            >
              {c.name}
              {c.organizationNumber ? ` (${c.organizationNumber})` : ""}
            </button>
          ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-name">Prosjektnavn</Label>
        <Input
          id="job-name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Kontaktperson *</Label>
        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Navn" />
        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Telefon" />
      </div>
      <div className="space-y-2">
        <Label>Avdeling</Label>
        <select
          className="h-11 w-full rounded-md border bg-transparent px-3"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">Ingen avdeling</option>
          {departments.map((department) => (
            <option key={department.externalId} value={department.externalId}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Hent priser fra *</Label>
        <Input
          value={templateQuery}
          onChange={(e) => setTemplateQuery(e.target.value)}
          placeholder="Søk malprosjekt"
        />
        {templateId && (
          <p className="text-sm">{templates.find((template) => template.externalId === templateId)?.name}</p>
        )}
        {templateQuery.trim().length >= 1 &&
          templateHits.slice(0, 12).map((template) => (
            <button
              key={template.externalId}
              type="button"
              className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setTemplateId(template.externalId);
                setTemplateQuery(template.name);
              }}
            >
              {template.name}
            </button>
          ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-loc">Sted (valgfritt)</Label>
        <Input id="job-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hms} onChange={(e) => setHms(e.target.checked)} />
        Større prosjekt / anlegg (SJA, SHA, vernerunde)
      </label>
      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? "Oppretter…" : "Opprett jobb"}
      </Button>
    </form>
  );
}
