"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createFieldJob } from "@/server/actions/accounting.actions";
import { createCustomerFromBrreg, searchBrregCompanies } from "@/server/actions/customer.actions";

type Customer = { externalId: string; name: string; organizationNumber: string | null };
type BrregHit = { organisasjonsnummer: string; navn: string };

export function NewJobForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [hms, setHms] = useState(false);
  const [brregQuery, setBrregQuery] = useState("");
  const [brregHits, setBrregHits] = useState<BrregHit[]>([]);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createFieldJob({
      name,
      customerExternalId: customerId || undefined,
      location,
      jobKind: hms ? "HMS" : "SERVICE",
    });
    setLoading(false);
    if (!res.success) {
      toast({ title: "Kunne ikke opprette", description: res.error, variant: "destructive" });
      return;
    }
    router.push(`/ansatt/jobber/${res.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Kunde (valgfritt)</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk i Tripletex-cache"
        />
        <select
          className="h-11 w-full rounded-md border bg-transparent px-3"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Ingen kunde</option>
          {filtered.map((c) => (
            <option key={c.externalId} value={c.externalId}>
              {c.name}
              {c.organizationNumber ? ` (${c.organizationNumber})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Ny kunde fra Brønnøysund</Label>
        <div className="flex gap-2">
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
              const hits = await searchBrregCompanies(brregQuery);
              setBrregHits(hits.map((h) => ({ organisasjonsnummer: h.organisasjonsnummer, navn: h.navn })));
            }}
          >
            Søk
          </Button>
        </div>
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
        <Label htmlFor="job-name">Hva skal gjøres?</Label>
        <Input
          id="job-name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="F.eks. Bytte kran på kjøkken"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-loc">Sted (valgfritt)</Label>
        <Input
          id="job-loc"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
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
