"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { createTenantForGroup } from "@/server/actions/corporate-group.actions";

export function AddTenantManual() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [showExtended, setShowExtended] = useState(false);

  const [form, setForm] = useState({
    name: "",
    orgNumber: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    postalCode: "",
    industry: "",
  });

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Bedriftsnavn er påkrevd", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const result = await createTenantForGroup({
          name: form.name,
          orgNumber: form.orgNumber || undefined,
          contactPerson: form.contactPerson || undefined,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          postalCode: form.postalCode || undefined,
          industry: form.industry || undefined,
        });
        const msg = result.emailSent
          ? `${form.name} opprettet — velkomst-e-post sendt til ${form.contactEmail}`
          : "Bedrift opprettet og tilknyttet konsernet";
        toast({ title: msg });
        setForm({ name: "", orgNumber: "", contactPerson: "", contactEmail: "", contactPhone: "", address: "", city: "", postalCode: "", industry: "" });
        setExpanded(false);
        setShowExtended(false);
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: err instanceof Error ? err.message : "Ukjent feil", variant: "destructive" });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Legg til bedrift manuelt
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Bedriftsnavn *</Label>
              <Input
                placeholder="F.eks. Fjord Hotell AS"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Org.nr</Label>
              <Input
                placeholder="912 345 678"
                value={form.orgNumber}
                onChange={(e) => setForm({ ...form, orgNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kontaktperson</Label>
              <Input
                placeholder="Navn"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-post</Label>
              <Input
                type="email"
                placeholder="kontakt@bedrift.no"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
          </div>

          {!showExtended && (
            <button
              type="button"
              onClick={() => setShowExtended(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              + Vis flere felter (telefon, adresse, bransje)
            </button>
          )}

          {showExtended && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Telefon</Label>
                <Input
                  placeholder="+47 123 45 678"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bransje</Label>
                <Input
                  placeholder="F.eks. hotell, bygg, helse"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Adresse</Label>
                <Input
                  placeholder="Gateadresse"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Postnr</Label>
                  <Input
                    placeholder="0001"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Poststed</Label>
                  <Input
                    placeholder="Oslo"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={pending || !form.name.trim()}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
            Opprett og tilknytt
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
